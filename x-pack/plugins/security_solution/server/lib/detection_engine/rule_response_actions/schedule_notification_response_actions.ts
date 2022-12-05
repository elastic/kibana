/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, map, uniq } from 'lodash';
import { replaceParamsQuery } from '../../../../common/utils/replace_params_query';
import type { RuleResponseAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { SetupPlugins } from '../../../plugin_contract';

interface ScheduleNotificationActions {
  signals: unknown[];
  responseActions: RuleResponseAction[];
}

interface IAlert {
  agent: {
    id: string;
  };
}

export const scheduleNotificationResponseActions = (
  { signals, responseActions }: ScheduleNotificationActions,
  osqueryCreateAction?: SetupPlugins['osquery']['osqueryCreateAction']
) => {
  const filteredAlerts = (signals as IAlert[]).filter((alert) => alert.agent?.id);
  const agentIds = uniq(filteredAlerts.map((alert: IAlert) => alert.agent?.id));
  const alertIds = map(filteredAlerts, '_id');

  const foundAlert = find(filteredAlerts, (alert) => alert.agent.id === agentIds?.[0]);

  responseActions.forEach((responseAction) => {
    if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && osqueryCreateAction) {
      const { savedQueryId, packId, queries, ecsMapping, query, ...rest } = responseAction.params;

      if (packId) {
        const replacedQueries = map(queries, (item) => {
          const { result, skipped } = replaceParamsQuery(item.query, foundAlert as object);
          return {
            ...item,
            query: result,
            skipped,
          };
        });

        return osqueryCreateAction({
          ...rest,
          queries: replacedQueries,
          agent_ids: agentIds,
          alert_ids: alertIds,
        });
      } else if (query) {
        const { result, skipped } = replaceParamsQuery(query, foundAlert as object);
        return osqueryCreateAction({
          ...rest,
          ...(query ? { query: result } : {}),
          ecs_mapping: ecsMapping,
          saved_query_id: savedQueryId,
          agent_ids: skipped ? [] : agentIds,
          alert_ids: alertIds,
        });
      }
    }
  });
};
