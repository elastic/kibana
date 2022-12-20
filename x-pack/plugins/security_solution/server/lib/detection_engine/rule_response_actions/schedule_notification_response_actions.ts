/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs } from '@kbn/ecs';
import { find, map, uniq, reduce } from 'lodash';
import type { RuleResponseAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { SetupPlugins } from '../../../plugin_contract';

interface ScheduleNotificationActions {
  signals: unknown[];
  responseActions: RuleResponseAction[];
}

export const scheduleNotificationResponseActions = (
  { signals, responseActions }: ScheduleNotificationActions,
  osqueryCreateAction?: SetupPlugins['osquery']['osqueryCreateAction']
) => {
  const filteredAlerts = (signals as Ecs[]).filter((alert) => alert.agent?.id);

  const alertsWithAgent = reduce(
    filteredAlerts,
    (acc: string[], alert) => {
      const agentId = alert.agent?.id;
      if (agentId !== undefined) {
        acc.push(agentId);
      }
      return acc;
    },
    []
  );
  const agentIds = uniq(alertsWithAgent);
  const alertIds = map(filteredAlerts, '_id');

  const foundAlert = find(filteredAlerts, (alert) => alert.agent?.id === agentIds?.[0]);

  responseActions.forEach((responseAction) => {
    if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && osqueryCreateAction) {
      const { savedQueryId, packId, queries, ecsMapping, query, ...rest } = responseAction.params;

      if (packId) {
        return osqueryCreateAction(
          {
            ...rest,
            queries,
            agent_ids: agentIds,
            alert_ids: alertIds,
          },
          foundAlert
        );
      }
      return osqueryCreateAction(
        {
          ...rest,
          query,
          ecs_mapping: ecsMapping,
          saved_query_id: savedQueryId,
          agent_ids: agentIds,
          alert_ids: alertIds,
        },
        foundAlert
      );
    }
  });
};
