/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce, each, uniq } from 'lodash';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SetupPlugins } from '../../../plugin_contract';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { osqueryResponseAction } from './osquery_response_action';
import { endpointResponseAction } from './endpoint_response_action';
import type { AlertsWithAgentType } from './types';
import type { ScheduleNotificationActions } from '../rule_types/types';

type Alerts = Array<ParsedTechnicalFields & { agent?: { id: string } }>;

interface ScheduleNotificationResponseActionsService {
  endpointAppContextService: EndpointAppContextService;
  osqueryCreateAction: SetupPlugins['osquery']['osqueryCreateAction'];
}

export const getScheduleNotificationResponseActionsService =
  ({
    osqueryCreateAction,
    endpointAppContextService,
  }: ScheduleNotificationResponseActionsService) =>
  ({ signals, responseActions, hasEnterpriseLicense }: ScheduleNotificationActions) => {
    const filteredAlerts = (signals as Alerts).filter((alert) => alert.agent?.id);

    const { alerts, agentIds, alertIds }: AlertsWithAgentType = reduce(
      filteredAlerts,
      (acc, alert) => {
        const agentId = alert.agent?.id;
        if (agentId !== undefined) {
          return {
            alerts: [...acc.alerts, alert],
            agentIds: uniq([...acc.agentIds, agentId]),
            alertIds: [...acc.alertIds, (alert as unknown as { _id: string })._id],
          };
        }
        return acc;
      },
      { alerts: [], agentIds: [], alertIds: [] } as AlertsWithAgentType
    );

    each(responseActions, (responseAction) => {
      if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && osqueryCreateAction) {
        osqueryResponseAction(responseAction, osqueryCreateAction, {
          alerts,
          alertIds,
          agentIds,
        });
      }
      if (responseAction.actionTypeId === RESPONSE_ACTION_TYPES.ENDPOINT && hasEnterpriseLicense) {
        endpointResponseAction(responseAction, endpointAppContextService, {
          alerts,
          alertIds,
          agentIds,
          ruleId: alerts[0][ALERT_RULE_UUID],
          ruleName: alerts[0][ALERT_RULE_NAME],
        });
      }
    });
  };
