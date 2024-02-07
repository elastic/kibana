/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { each } from 'lodash';

import type { ExperimentalFeatures } from '../../../../common';
import { isIsolateAction, isProcessesAction } from './endpoint_params_type_guards';
import type { RuleResponseEndpointAction } from '../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { getProcessAlerts, getIsolateAlerts, getErrorProcessAlerts } from './utils';

import type { ResponseActionAlerts, AlertsAction } from './types';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts,
  experimentalFeatures: ExperimentalFeatures
) => {
  const { comment, command } = responseAction.params;

  const commonData = {
    comment,
    command,
    rule_id: alerts[0][ALERT_RULE_UUID],
    rule_name: alerts[0][ALERT_RULE_NAME],
    agent_type: 'endpoint' as const,
  };

  if (isIsolateAction(responseAction.params)) {
    const alertsPerAgent = getIsolateAlerts(alerts);
    each(alertsPerAgent, (actionPayload) => {
      return endpointAppContextService.getActionCreateService().createActionFromAlert(
        {
          ...actionPayload,
          ...commonData,
        },
        actionPayload.endpoint_ids
      );
    });
  }

  const automatedProcessActionsEnabled = experimentalFeatures?.automatedProcessActionsEnabled;

  if (automatedProcessActionsEnabled) {
    const createProcessActionFromAlerts = (
      actionAlerts: Record<string, Record<string, AlertsAction>>
    ) => {
      const createAction = async (alert: AlertsAction) => {
        const { hosts, parameters, error } = alert;

        const actionData = {
          hosts,
          endpoint_ids: alert.endpoint_ids,
          alert_ids: alert.alert_ids,
          error,
          parameters,
          ...commonData,
        };

        return endpointAppContextService
          .getActionCreateService()
          .createActionFromAlert(actionData, alert.endpoint_ids);
      };
      return each(actionAlerts, (actionPerAgent) => {
        return each(actionPerAgent, createAction);
      });
    };

    if (isProcessesAction(responseAction.params)) {
      const foundFields = getProcessAlerts(alerts, responseAction.params.config);
      const notFoundField = getErrorProcessAlerts(alerts, responseAction.params.config);

      const processActions = createProcessActionFromAlerts(foundFields);
      const processActionsWithError = createProcessActionFromAlerts(notFoundField);

      return Promise.all([processActions, processActionsWithError]);
    }
  }
};
