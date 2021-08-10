/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash';
import { EuiErrorBoundary, EuiLoadingContent, EuiEmptyPrompt } from '@elastic/eui';
import React, { useMemo, useEffect, useState } from 'react';
import { QueryClientProvider } from 'react-query';
import { useAgentDetails } from '../../agents/use_agent_details';
import { useAgentPolicy } from '../../agent_policies';
import { useOsqueryIntegrationStatus } from '../../common/hooks';
import { KibanaContextProvider, useKibana } from '../../common/lib/kibana';

import { LiveQueryForm } from '../../live_queries/form';
import { queryClient } from '../../query_client';

interface OsqueryActionProps {
  metadata?: Record<string, any> | undefined;
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({ metadata }) => {
  const permissions = useKibana().services.application.capabilities.osquery;

  const agentId = metadata?.info?.agent?.id ?? null;
  const { data: agentData, isFetched: agentFetched } = useAgentDetails({ agentId });
  const { data: agentPolicyData, isFetched: policyFetched } = useAgentPolicy({
    policyId: agentData?.item?.policy_id,
    skip: !agentData,
  });
  console.error('agentId', agentId, agentData, agentPolicyData);

  const osqueryAvailable = useMemo(() => {
    const osqueryPackageInstalled = find(agentPolicyData?.package_policies, [
      'package.name',
      'osquery_manager',
    ]);
    return osqueryPackageInstalled?.enabled;
  }, [agentPolicyData?.package_policies]);

  if (!agentFetched || !policyFetched) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!osqueryAvailable) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={<h2>Error Osquery not installed</h2>}
        body={
          <p>Osquery is not installed on this agent. Please contact your Kibana administrator.</p>
        }
      />
    );
  }

  if (agentData?.item?.status !== 'online') {
    console.error('active,', agentData?.item?.status);
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={<h2>Error agent is inactive</h2>}
        body={
          <p>
            Agent has be `active` for running Osquery queries. Please contact your Kibana
            administrator.
          </p>
        }
      />
    );
  }

  if (osqueryAvailable && (permissions.runSavedQueries || !permissions.writeLiveQueries)) {
    return (
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
      <LiveQueryForm defaultValue={{ agentSelection: { agents: [agentId] } }} agentId={agentId} />
    );
  }

  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="danger"
      title={<h2>Error missing permissions</h2>}
      body={
        <p>
          You are missing a Kibana privilege to run osquery queries. Please contact your Kibana
          administrator.
        </p>
      }
    />
  );
};

export const OsqueryAction = React.memo(OsqueryActionComponent);

// @ts-expect-error update types
const OsqueryActionWrapperComponent = ({ services, ...props }) => (
  <KibanaContextProvider services={services}>
    <EuiErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OsqueryAction {...props} />
      </QueryClientProvider>
    </EuiErrorBoundary>
  </KibanaContextProvider>
);

const OsqueryActionWrapper = React.memo(OsqueryActionWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionWrapper as default };
