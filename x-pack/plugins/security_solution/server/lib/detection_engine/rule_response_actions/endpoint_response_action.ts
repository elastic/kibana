/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, flatMap, flatten, map } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type {
  RuleResponseEndpointAction,
  EndpointParams,
} from '../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';

import type {
  Alert,
  AlertAgent,
  EndpointResponseActionAlerts,
  ResponseActionAlerts,
  AlertsFoundFields,
} from './types';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
) => {
  const { comment, command } = responseAction.params;
  const uniqueAlerts = alerts.reduce((acc: EndpointResponseActionAlerts, alert) => {
    const { id: agentId, name: agentName } = alert.agent || {};
    const existingAgent = acc[agentId];

    const foundFields = getProcessAlerts(acc, alert, responseAction.params.config, false);
    const notFoundFields = getProcessAlerts(acc, alert, responseAction.params.config, true);

    return {
      ...acc,
      [agentId]: {
        ...existingAgent,
        agent: {
          ...existingAgent?.agent,
          id: agentId,
          name: agentName,
        },
        foundFields: { ...(existingAgent?.foundFields || {}), ...foundFields },
        notFoundFields: { ...(existingAgent?.notFoundFields || {}), ...notFoundFields },
        hosts: {
          ...(existingAgent?.hosts || {}),
          [agentId]: {
            name: agentName || existingAgent?.hosts?.[agentId]?.name || '',
          },
        },
        alertIds: [...(existingAgent?.alertIds || []), alert._id],
      },
    };
  }, {});

  const commonData = {
    comment,
    command,
    rule_id: alerts[0][ALERT_RULE_UUID],
    rule_name: alerts[0][ALERT_RULE_NAME],
  };

  if (command === 'isolate') {
    const actions = map(uniqueAlerts, async (alertPerAgent) =>
      endpointAppContextService.getActionCreateService().createActionFromAlert(
        {
          hosts: alertPerAgent.hosts,
          endpoint_ids: [alertPerAgent.agent.id],
          alert_ids: alertPerAgent.alertIds,
          ...commonData,
        },
        [alertPerAgent.agent.id]
      )
    );
    return Promise.all(actions);
  }

  const createActionFromAlerts = (
    actionAlerts: EndpointResponseActionAlerts,
    type: 'foundFields' | 'notFoundFields',
    hasErrors: boolean
  ) => {
    const flatAlerts = flatten(map(actionAlerts, (agent) => flatMap(agent[type])));
    const createAction = async (alert: AlertsFoundFields) => {
      const { hosts, agentId, alertIds, parameters, error } = alert;
      const actionData = {
        hosts,
        endpoint_ids: [agentId],
        alert_ids: alertIds,
        error: hasErrors ? error : undefined,
        parameters,
        ...commonData,
      };

      return endpointAppContextService
        .getActionCreateService()
        .createActionFromAlert(actionData, [agentId]);
    };

    return each(flatAlerts, createAction);
  };

  if (command === 'kill-process' || command === 'suspend-process') {
    const processActions = createActionFromAlerts(uniqueAlerts, 'foundFields', false);
    const processActionsWithError = createActionFromAlerts(uniqueAlerts, 'notFoundFields', true);

    return Promise.all([processActions, processActionsWithError]);
  }
};

const getProcessAlerts = (
  acc: EndpointResponseActionAlerts,
  alert: Alert,
  config?: EndpointParams['config'],
  checkErrors?: boolean
) => {
  if (!config) {
    return {};
  }
  const { overwrite, field } = config;
  const valueFromAlert = overwrite ? alert.process?.pid : alert[field];
  const isEntityId = !overwrite && field.includes('entity_id');
  const key = isEntityId ? 'entity_id' : 'pid';
  const { _id, agent } = alert;
  const { id: agentId, name } = agent as AlertAgent;

  const baseFields = {
    alertIds: [
      ...(acc?.[agentId]?.[checkErrors ? 'notFoundFields' : 'foundFields']?.[field]?.alertIds ||
        []),
      _id,
    ],
    parameters: { [key]: valueFromAlert || `${field} not found` },
    agentId,
    hosts: { [agentId]: { name: name || '' } },
  };
  if (valueFromAlert && !checkErrors) {
    return {
      [valueFromAlert]: baseFields,
    };
  } else if (!valueFromAlert && checkErrors) {
    const errorField = overwrite ? 'process.pid' : field;
    return {
      [errorField]: { ...baseFields, error: errorField },
    };
  }
  return {};
};
