/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash';
import { EuiErrorBoundary, EuiLoadingContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import React, { useMemo } from 'react';
import { QueryClientProvider } from 'react-query';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { useAgentDetails } from '../../agents/use_agent_details';
import { useAgentPolicy } from '../../agent_policies';
import { KibanaContextProvider, useKibana } from '../../common/lib/kibana';

import { LiveQuery } from '../../live_queries';
import { queryClient } from '../../query_client';
import { OsqueryIcon } from '../../components/osquery_icon';
import { KibanaThemeProvider } from '../../shared_imports';

interface OsqueryActionProps {
  metadata?: {
    info: {
      agent: { id: string };
    };
  };
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({ metadata }) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const agentId = metadata?.info?.agent?.id ?? undefined;
  const {
    data: agentData,
    isFetched: agentFetched,
    isLoading,
  } = useAgentDetails({
    agentId,
    silent: true,
    skip: !agentId,
  });
  const {
    data: agentPolicyData,
    isFetched: policyFetched,
    isError: policyError,
    isLoading: policyLoading,
  } = useAgentPolicy({
    policyId: agentData?.policy_id,
    skip: !agentData,
    silent: true,
  });

  const osqueryAvailable = useMemo(() => {
    if (policyError) return false;

    const osqueryPackageInstalled = find(agentPolicyData?.package_policies, [
      'package.name',
      OSQUERY_INTEGRATION_NAME,
    ]);
    return osqueryPackageInstalled?.enabled;
  }, [agentPolicyData?.package_policies, policyError]);

  if (!(permissions.runSavedQueries || permissions.writeLiveQueries)) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Permissions denied</h2>}
        titleSize="xs"
        body={
          <p>
            To access this page, ask your administrator for <EuiCode>osquery</EuiCode> Kibana
            privileges.
          </p>
        }
      />
    );
  }

  if (isLoading) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!agentId || (agentFetched && !agentData)) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is not available</h2>}
        titleSize="xs"
        body={
          <p>
            An Elastic Agent is not installed on this host. To run queries, install Elastic Agent on
            the host, and then add the Osquery Manager integration to the agent policy in Fleet.
          </p>
        }
      />
    );
  }

  if (!policyFetched && policyLoading) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!osqueryAvailable) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is not available</h2>}
        titleSize="xs"
        body={
          <p>
            The Osquery Manager integration is not added to the agent policy. To run queries on the
            host, add the Osquery Manager integration to the agent policy in Fleet.
          </p>
        }
      />
    );
  }

  if (agentData?.status !== 'online') {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is not available</h2>}
        titleSize="xs"
        body={
          <p>
            To run queries on this host, the Elastic Agent must be active. Check the status of this
            agent in Fleet.
          </p>
        }
      />
    );
  }

  return <LiveQuery formType="simple" agentId={agentId} />;
};

export const OsqueryAction = React.memo(OsqueryActionComponent);

// @ts-expect-error update types
const OsqueryActionWrapperComponent = ({ services, ...props }) => (
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryAction {...props} />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryActionWrapper = React.memo(OsqueryActionWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionWrapper as default };
