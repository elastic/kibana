/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { EuiCode, EuiLoadingContent, EuiEmptyPrompt } from '@elastic/eui';
import React, { useMemo, ReactElement } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { LiveQueryForm } from './form';
import { useActionResultsPrivileges } from '../action_results/use_action_privileges';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { OsqueryIcon } from '../components/osquery_icon';

interface LiveQueryProps {
  agentId?: string;
  agentIds?: string[];
  agentPolicyIds?: string[];
  onSuccess?: () => void;
  query?: string;
  savedQueryId?: string;
  ecs_mapping?: unknown;
  agentsField?: boolean;
  queryField?: boolean;
  ecsMappingField?: boolean;
  enabled?: boolean;
  formType?: 'steps' | 'simple';
  addToTimeline?: (actionId: string) => void;
}

const LiveQueryComponent: React.FC<LiveQueryProps> = ({
  agentId,
  agentIds,
  agentPolicyIds,
  onSuccess,
  query,
  savedQueryId,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ecs_mapping,
  agentsField,
  queryField,
  ecsMappingField,
  formType,
  enabled,
  addToTimeline,
}) => {
  const { data: hasActionResultsPrivileges, isLoading } = useActionResultsPrivileges();

  const defaultValue = useMemo(() => {
    if (agentId || agentPolicyIds?.length || query?.length) {
      const agentSelection =
        agentId || agentPolicyIds?.length
          ? {
              allAgentsSelected: false,
              agents: castArray(agentId ?? agentIds ?? []),
              platformsSelected: [],
              policiesSelected: agentPolicyIds ?? [],
            }
          : null;

      return {
        ...(agentSelection ? { agentSelection } : {}),
        query,
        savedQueryId,
        ecs_mapping,
      };
    }

    return undefined;
  }, [agentId, agentIds, agentPolicyIds, ecs_mapping, query, savedQueryId]);

  if (isLoading) {
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
    <LiveQueryForm
      agentsField={agentId ? !agentId : agentsField}
      queryField={queryField}
      ecsMappingField={ecsMappingField}
      defaultValue={defaultValue}
      onSuccess={onSuccess}
      formType={formType}
      enabled={enabled}
      addToTimeline={addToTimeline}
    />
  );
};

export const LiveQuery = React.memo(LiveQueryComponent);
