/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type {
  SentinelOneGetAgentsParams,
  SentinelOneGetAgentsResponse,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import { SENTINELONE_CONNECTOR_ID, SUB_ACTION } from '@kbn/stack-connectors-plugin/public/common';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSubAction } from '../../../timelines/components/side_panel/event_details/flyout/use_sub_action';
import { useLoadConnectors } from '../../../common/components/response_actions/use_load_connectors';
import { SENTINEL_ONE_NETWORK_STATUS } from './sentinel_one_agent_status';

/**
 * Using SentinelOne connector to pull agent's data from the SentinelOne API. If the agentId is in the transition state
 * (isolating/releasing) it will keep pulling the state until it finalizes the action
 * @param agentId
 */
export const useSentinelOneAgentData = ({ agentId }: { agentId?: string }) => {
  const sentinelOneManualHostActionsEnabled = useIsExperimentalFeatureEnabled(
    'sentinelOneManualHostActionsEnabled'
  );
  const { data: connector } = useLoadConnectors({ actionTypeId: SENTINELONE_CONNECTOR_ID });

  return useSubAction<SentinelOneGetAgentsParams, SentinelOneGetAgentsResponse>({
    connectorId: connector?.[0]?.id,
    subAction: SUB_ACTION.GET_AGENTS,
    subActionParams: {
      uuid: agentId,
    },
    disabled: !sentinelOneManualHostActionsEnabled || isEmpty(agentId),
    // @ts-expect-error update types
    refetchInterval: (lastResponse: { data: SentinelOneGetAgentsResponse }) => {
      const networkStatus = lastResponse?.data?.data?.[0]
        .networkStatus as SENTINEL_ONE_NETWORK_STATUS;

      return [
        SENTINEL_ONE_NETWORK_STATUS.CONNECTING,
        SENTINEL_ONE_NETWORK_STATUS.DISCONNECTING,
      ].includes(networkStatus)
        ? 5000
        : false;
    },
  });
};
