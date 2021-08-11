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
import { KibanaContextProvider, useKibana } from '../../common/lib/kibana';

import { LiveQueryForm } from '../../live_queries/form';
import { queryClient } from '../../query_client';
import { OsqueryIcon } from '../../components/osquery_icon';

interface OsqueryActionProps {
  metadata?: Record<string, any> | undefined;
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({ metadata }) => {
  const { fleet } = useKibana().services;
  const permissions = useKibana().services.application.capabilities.osquery;
  const [fleetAvailable, setFleetAvailable] = useState<boolean | null>(null);

  const agentId = metadata?.info?.agent?.id ?? null;
  const { data: agentData, isFetched: agentFetched } = useAgentDetails({
    agentId,
    silent: true,
    skip: !fleetAvailable || !agentId,
  });
  const { data: agentPolicyData, isFetched: policyFetched } = useAgentPolicy({
    policyId: agentData?.item?.policy_id,
    skip: !fleetAvailable || !agentData,
    silent: true,
  });

  const osqueryAvailable = useMemo(() => {
    const osqueryPackageInstalled = find(agentPolicyData?.package_policies, [
      'package.name',
      'osquery_manager',
    ]);
    return osqueryPackageInstalled?.enabled;
  }, [agentPolicyData?.package_policies]);

  useEffect(() => {
    const verifyFleet = async () => {
      if (!fleet?.isInitialized) return false;

      return setFleetAvailable(await fleet.isInitialized());
    };
    verifyFleet();
  }, [fleet]);

  if (!(permissions.runSavedQueries || permissions.writeLiveQueries)) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is unavailable</h2>}
        titleSize="xs"
        body={
          <p>
            {`Your user role doesn’t have Osquery permissions to run live queries. Administrators can update role permissions in Stack Management > Roles.`}
          </p>
        }
      />
    );
  }

  if (fleetAvailable === null) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!fleetAvailable) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is unavailable</h2>}
        titleSize="xs"
        body={
          <p>
            Fleet is disabled in this cluster. To run queries on this host, an administrator must
            enable Fleet on the cluster, install Elastic Agent on this host, and then add the
            <code>Osquery Manager</code> integration to the agent policy in Fleet.
          </p>
        }
      />
    );
  }

  if (!metadata?.info?.agent?.id) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is unavailable</h2>}
        titleSize="xs"
        body={
          <p>
            An Elastic Agent is not installed on this host. To run queries on this host, an
            administrator must install Elastic Agent, and then add the Osquery Manager integration
            to the agent policy in Fleet
          </p>
        }
      />
    );
  }

  if (!agentFetched || !policyFetched) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!osqueryAvailable) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is unavailable</h2>}
        titleSize="xs"
        body={
          <p>Osquery is not installed on this agent. Please contact your Kibana administrator.</p>
        }
      />
    );
  }

  if (agentData?.item?.status !== 'online') {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>Osquery is unavailable</h2>}
        titleSize="xs"
        body={
          <p>
            Agent has to be online for running Osquery queries. Please contact your Kibana
            administrator.
          </p>
        }
      />
    );
  }

  return (
    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
    <LiveQueryForm defaultValue={{ agentSelection: { agents: [agentId] } }} agentId={agentId} />
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
