/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each } from 'lodash';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SetupPlugins } from '../../../plugin_contract';
import { ResponseActionTypesEnum } from '../../../../common/api/detection_engine/model/rule_response_actions';
import { osqueryResponseAction } from './osquery_response_action';
import { endpointResponseAction } from './endpoint_response_action';
import type { ScheduleNotificationActions } from '../rule_types/types';
import type { AlertWithAgent, Alert } from './types';

interface ScheduleNotificationResponseActionsService {
  endpointAppContextService: EndpointAppContextService;
  osqueryCreateActionService?: SetupPlugins['osquery']['createActionService'];
}

export const getScheduleNotificationResponseActionsService =
  ({
    osqueryCreateActionService,
    endpointAppContextService,
  }: ScheduleNotificationResponseActionsService) =>
  ({ signals, responseActions }: ScheduleNotificationActions) => {
    const alerts = (signals as Alert[]).filter((alert) => alert.agent?.id) as AlertWithAgent[];

    each(responseActions, (responseAction) => {
      if (
        responseAction.actionTypeId === ResponseActionTypesEnum['.osquery'] &&
        osqueryCreateActionService
      ) {
        osqueryResponseAction(responseAction, osqueryCreateActionService, {
          alerts,
        });
      }
      if (responseAction.actionTypeId === ResponseActionTypesEnum['.endpoint']) {
        endpointResponseAction(responseAction, endpointAppContextService, {
          alerts,
        });
      }
    });
  };
