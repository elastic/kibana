/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAgent, AlertWithAgent, AlertsAction } from './types';
import type { EndpointParams } from '../../../../common/api/detection_engine';

export const getProcessAlerts = (
  alerts: AlertWithAgent[],
  config?: EndpointParams['config'],
  checkErrors?: boolean
) => {
  if (!config) {
    return {};
  }
  const { overwrite, field } = config;

  return alerts.reduce((acc: Record<string, AlertsAction>, alert) => {
    const valueFromAlert: number = overwrite ? alert.process?.pid : alert[field];
    const isEntityId = !overwrite && field.includes('entity_id');
    const key = isEntityId ? 'entity_id' : 'pid';
    const { _id, agent } = alert;
    const { id: agentId, name } = agent as AlertAgent;
    const hostName = alert.host?.name;

    const currentValue = acc[valueFromAlert];
    const baseFields = {
      alert_ids: [...(currentValue?.alert_ids || []), _id],
      parameters: { [key]: valueFromAlert || `${field} not found` },
      endpoint_ids: [...new Set([...(currentValue?.endpoint_ids || []), agentId])],
      hosts: {
        ...currentValue?.hosts,
        [agentId]: { name: name || hostName, id: agentId },
      },
    };

    if (valueFromAlert && !checkErrors) {
      return {
        ...acc,
        [valueFromAlert]: baseFields,
      };
    } else if (!valueFromAlert && checkErrors) {
      const errorField = overwrite ? 'process.pid' : field;
      return {
        ...acc,
        [errorField]: { ...baseFields, error: errorField },
      };
    }
    return acc;
  }, {});
};

export const getIsolateAlerts = (alerts: AlertWithAgent[]) =>
  alerts.reduce((acc, alert) => {
    const { id: agentId, name: agentName } = alert.agent || {};

    const hostName = alert.host?.name;
    return {
      ...acc,
      hosts: {
        ...(acc.hosts || {}),
        [agentId]: {
          name: agentName || hostName || '',
          id: agentId,
        },
      },
      endpoint_ids: [...new Set([...(acc.endpoint_ids || []), agentId])],
      alert_ids: [...(acc.alert_ids || []), alert._id],
    };
  }, {} as AlertsAction);
