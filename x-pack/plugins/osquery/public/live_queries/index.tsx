/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, isEmpty, pickBy } from 'lodash';
import { EuiCode, EuiSkeletonText, EuiEmptyPrompt } from '@elastic/eui';
import React, { useContext, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { replaceParamsQuery } from '../../common/utils/replace_params_query';
import { AlertAttachmentContext } from '../common/contexts';
import { LiveQueryForm } from './form';
import { useActionResultsPrivileges } from '../action_results/use_action_privileges';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { OsqueryIcon } from '../components/osquery_icon';
import type { AgentSelection } from '../agents/types';

interface LiveQueryProps {
  agentId?: string;
  agentIds?: string[];
  alertIds?: string[];
  agentPolicyIds?: string[];
  onSuccess?: () => void;
  query?: string;
  savedQueryId?: string;
  ecs_mapping?: ECSMapping;
  agentsField?: boolean;
  queryField?: boolean;
  ecsMappingField?: boolean;
  enabled?: boolean;
  formType?: 'steps' | 'simple';
  hideAgentsField?: boolean;
  packId?: string;
  agentSelection?: AgentSelection;
}

const LiveQueryComponent: React.FC<LiveQueryProps> = ({
  agentId,
  agentIds,
  alertIds,
  agentPolicyIds,
  onSuccess,
  query,
  savedQueryId,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ecs_mapping,
  queryField,
  ecsMappingField,
  formType,
  enabled,
  hideAgentsField,
  packId,
  agentSelection,
}) => {
  const { data: hasActionResultsPrivileges, isLoading } = useActionResultsPrivileges();

  const initialAgentSelection = useMemo(() => {
    if (agentSelection) {
      return agentSelection;
    }

    if (agentId || agentPolicyIds?.length) {
      return {
        allAgentsSelected: false,
        agents: castArray(agentId ?? agentIds ?? []),
        platformsSelected: [],
        policiesSelected: agentPolicyIds ?? [],
      };
    }

    return null;
  }, [agentId, agentIds, agentPolicyIds, agentSelection]);
  const ecsData = useContext(AlertAttachmentContext);

  const initialQuery = useMemo(() => {
    if (ecsData && query) {
      const { result } = replaceParamsQuery(query, ecsData);

      return result;
    }

    return query;
  }, [ecsData, query]);

  const defaultValue = useMemo(() => {
    const initialValue = {
      ...(initialAgentSelection ? { agentSelection: initialAgentSelection } : {}),
      alertIds,
      query: initialQuery,
      savedQueryId,
      ecs_mapping,
      packId,
    };

    return !isEmpty(pickBy(initialValue, (value) => !isEmpty(value))) ? initialValue : undefined;
  }, [alertIds, ecs_mapping, initialAgentSelection, initialQuery, packId, savedQueryId]);

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
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
      queryField={queryField}
      ecsMappingField={ecsMappingField}
      defaultValue={defaultValue}
      onSuccess={onSuccess}
      formType={formType}
      enabled={enabled}
      hideAgentsField={hideAgentsField}
    />
  );
};

export const LiveQuery = React.memo(LiveQueryComponent);
