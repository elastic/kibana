/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SetupPlugins } from '../../../plugin_contract';
import { ResponseActionTypesEnum } from '../../../../common/api/detection_engine/model/rule_response_actions';
import { osqueryResponseAction } from './osquery_response_action';
import { endpointResponseAction } from './endpoint_response_action';
import type { ScheduleNotificationActions } from '../rule_types/types';
import type { Alert, AlertWithAgent } from './types';

interface ScheduleNotificationResponseActionsService {
  endpointAppContextService: EndpointAppContextService;
  osqueryCreateActionService?: SetupPlugins['osquery']['createActionService'];
}

export const getScheduleNotificationResponseActionsService =
  ({
    osqueryCreateActionService,
    endpointAppContextService,
  }: ScheduleNotificationResponseActionsService) =>
  async ({ signals, signalsCount, responseActions }: ScheduleNotificationActions) => {
    if (!signalsCount || !responseActions?.length) {
      return;
    }
    // expandDottedObject is needed eg in ESQL rule because it's alerts come without nested agent, host etc data but everything is dotted
    const nestedAlerts = signals.map((signal) => expandDottedObject(signal as object)) as Alert[];
    const alerts = nestedAlerts.filter((alert) => alert.agent?.id) as AlertWithAgent[];

    await Promise.all(
      responseActions.map(async (responseAction) => {
        if (
          responseAction.actionTypeId === ResponseActionTypesEnum['.osquery'] &&
          osqueryCreateActionService
        ) {
          await osqueryResponseAction(responseAction, osqueryCreateActionService, {
            alerts,
          });
        }
        if (responseAction.actionTypeId === ResponseActionTypesEnum['.endpoint']) {
          // We currently support only automated response actions for Elastic Defend. This will
          // need to be updated once we introduce support for other EDR systems.
          // For an explanation of why this is needed, see this comment here:
          // https://github.com/elastic/kibana/issues/180774#issuecomment-2139526239
          const alertsFromElasticDefend = alerts.filter((alert) => alert.agent.type === 'endpoint');

          if (alertsFromElasticDefend.length > 0) {
            await endpointResponseAction(responseAction, endpointAppContextService, {
              alerts: alertsFromElasticDefend,
            });
          }
        }
      })
    );
  };
