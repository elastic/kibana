/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce, each } from 'lodash';
import type { EndpointAppContext } from '../../../endpoint/types';
import type { RuleResponseAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { SetupPlugins } from '../../../plugin_contract';
import { endpointResponseAction } from './endpoint_response_action';
import { osqueryResponseAction } from './osquery_response_action';
import type { Alerts, AlertsWithAgentType } from './types';

interface ScheduleNotificationActions {
  signals: unknown[];
  responseActions: RuleResponseAction[];
}

export const scheduleNotificationResponseActions = (
  { signals, responseActions }: ScheduleNotificationActions,
  osqueryCreateAction?: SetupPlugins['osquery']['osqueryCreateAction'],
  endpointAppContext?: EndpointAppContext
) => {
  const filteredAlerts = (signals as Alerts).filter((alert) => alert.agent?.id);

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

  each(responseActions, (responseAction) => {
    if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && osqueryCreateAction) {
      osqueryResponseAction(responseAction, osqueryCreateAction, { alerts, alertIds, agents });
    }
    if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.ENDPOINT && endpointAppContext) {
      endpointResponseAction(responseAction, endpointAppContext, { alerts });
    }
  });
};
