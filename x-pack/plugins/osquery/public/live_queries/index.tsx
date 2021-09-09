/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiLoadingContent, EuiEmptyPrompt } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { LiveQueryForm } from './form';
import { useActionResultsPrivileges } from '../action_results/use_action_privileges';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { OsqueryIcon } from '../components/osquery_icon';

interface LiveQueryProps {
  agentId?: string;
  agentPolicyId?: string;
  onSuccess?: () => void;
  query?: string;
}

const LiveQueryComponent: React.FC<LiveQueryProps> = ({
  agentId,
  agentPolicyId,
  onSuccess,
  query,
}) => {
  const { data: hasActionResultsPrivileges, isFetched } = useActionResultsPrivileges();

  const defaultValue = useMemo(() => {
    if (agentId || agentPolicyId || query) {
      return {
        agentSelection: {
          allAgentsSelected: false,
          agents: agentId ? [agentId] : [],
          platformsSelected: [],
          policiesSelected: agentPolicyId ? [agentPolicyId] : [],
        },
        query,
      };
    }

    return undefined;
  }, [agentId, agentPolicyId, query]);

  if (!isFetched) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!hasActionResultsPrivileges) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={
          <h2>
            <FormattedMessage
              id="xpack.osquery.liveQuery.permissionDeniedPromptTitle"
              defaultMessage="Permission denied"
            />
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.osquery.liveQuery.permissionDeniedPromptBody"
              defaultMessage="To view query results, ask your administrator to update your user role to have index {read} privileges on the {logs} index."
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                read: <EuiCode>read</EuiCode>,
                logs: <EuiCode>logs-{OSQUERY_INTEGRATION_NAME}.result*</EuiCode>,
              }}
            />
          </p>
        }
      />
    );
  }

  return (
    <LiveQueryForm singleAgentMode={!!agentId} defaultValue={defaultValue} onSuccess={onSuccess} />
  );
};

export const LiveQuery = React.memo(LiveQueryComponent);
