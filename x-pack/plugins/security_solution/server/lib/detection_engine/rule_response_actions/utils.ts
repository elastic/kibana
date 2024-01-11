/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert, AlertAgent, AlertWithAgent, EndpointResponseActionAlerts } from './types';
import type {
  EndpointParams,
  RuleResponseEndpointAction,
} from '../../../../common/api/detection_engine';

export const getProcessAlerts = (
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

  const hostName = alert.host?.name;
  const baseFields = {
    alertIds: [
      ...(acc?.[agentId]?.[checkErrors ? 'notFoundFields' : 'foundFields']?.[field]?.alertIds ||
        []),
      _id,
    ],
    parameters: { [key]: valueFromAlert || `${field} not found` },
    agentId,
    hosts: { [agentId]: { name: name || hostName, id: agentId || '' } },
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

export const getUniqueAlerts = (
  alerts: AlertWithAgent[],
  responseAction: RuleResponseEndpointAction
) =>
  alerts.reduce((acc: EndpointResponseActionAlerts, alert) => {
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
            name: agentName || alert.host?.name || existingAgent?.hosts?.[agentId]?.name || '',
            id: agentId,
          },
        },
        alertIds: [...(existingAgent?.alertIds || []), alert._id],
      },
    };
  }, {});
