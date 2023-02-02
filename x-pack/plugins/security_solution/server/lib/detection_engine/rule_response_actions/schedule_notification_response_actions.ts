/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs } from '@kbn/ecs';
import { uniq, reduce, some, each } from 'lodash';
import type { RuleResponseAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { SetupPlugins } from '../../../plugin_contract';

interface ScheduleNotificationActions {
  signals: unknown[];
  responseActions: RuleResponseAction[];
}

interface AlertsWithAgentType {
  alerts: Ecs[];
  agents: string[];
  alertIds: string[];
}
const CONTAINS_DYNAMIC_PARAMETER_REGEX = /\{{([^}]+)\}}/g; // when there are 2 opening and 2 closing curly brackets (including brackets)

export const scheduleNotificationResponseActions = (
  { signals, responseActions }: ScheduleNotificationActions,
  osqueryCreateAction?: SetupPlugins['osquery']['osqueryCreateAction']
) => {
  const filteredAlerts = (signals as Ecs[]).filter((alert) => alert.agent?.id);

  const { alerts, agents, alertIds }: AlertsWithAgentType = reduce(
    filteredAlerts,
    (acc, alert) => {
      const agentId = alert.agent?.id;
      if (agentId !== undefined) {
        return {
          alerts: [...acc.alerts, alert],
          agents: [...acc.agents, agentId],
          alertIds: [...acc.alertIds, (alert as unknown as { _id: string })._id],
        };
      }
      return acc;
    },
    { alerts: [], agents: [], alertIds: [] } as AlertsWithAgentType
  );
  const agentIds = uniq(agents);

  each(responseActions, (responseAction) => {
    if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && osqueryCreateAction) {
      const temporaryQueries = responseAction.params.queries?.length
        ? responseAction.params.queries
        : [{ query: responseAction.params.query }];
      const containsDynamicQueries = some(temporaryQueries, (query) => {
        return query.query ? CONTAINS_DYNAMIC_PARAMETER_REGEX.test(query.query) : false;
      });
      const { savedQueryId, packId, queries, ecsMapping, ...rest } = responseAction.params;

      if (!containsDynamicQueries) {
        return osqueryCreateAction({
          ...rest,
          queries,
          ecs_mapping: ecsMapping,
          saved_query_id: savedQueryId,
          agent_ids: agentIds,
          alert_ids: alertIds,
        });
      }
      each(alerts, (alert) => {
        return osqueryCreateAction(
          {
            ...rest,
            queries,
            ecs_mapping: ecsMapping,
            saved_query_id: savedQueryId,
            agent_ids: alert.agent?.id ? [alert.agent.id] : [],
            alert_ids: [(alert as unknown as { _id: string })._id],
          },
          alert
        );
      });
    }
  });
};
