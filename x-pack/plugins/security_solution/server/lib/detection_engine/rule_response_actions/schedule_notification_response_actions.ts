/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, uniq } from 'lodash';
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

  responseActions.forEach((responseAction) => {
    if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && osqueryCreateAction) {
      const { savedQueryId, packId, queries, ecsMapping, ...rest } = responseAction.params;

      return osqueryCreateAction({
        ...rest,
        queries,
        ecs_mapping: ecsMapping,
        saved_query_id: savedQueryId,
        agent_ids: agentIds,
        alert_ids: alertIds,
      });
    }
  });
};
