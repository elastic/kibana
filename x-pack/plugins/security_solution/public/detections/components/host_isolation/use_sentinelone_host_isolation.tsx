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
  });
};
