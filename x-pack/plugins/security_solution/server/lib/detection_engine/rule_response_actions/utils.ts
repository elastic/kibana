/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { AlertAgent, AlertWithAgent, AlertsAction } from './types';
import type { EndpointParams } from '../../../../common/api/detection_engine';

export const getProcessAlerts = (alerts: AlertWithAgent[], config: EndpointParams['config']) => {
  if (!config) {
    return {};
  }
  const { overwrite, field } = config;

  return alerts.reduce((acc: Record<string, AlertsAction>, alert) => {
    const valueFromAlert: number = overwrite ? alert.process?.pid : get(alert, field);

    if (valueFromAlert) {
      const isEntityId = !overwrite && field.includes('entity_id');
      const paramKey = isEntityId ? 'entity_id' : 'pid';
      const { _id, agent } = alert;
      const { id: agentId, name } = agent as AlertAgent;
      const hostName = alert.host?.name;

      const currentValue = acc[valueFromAlert];

      return {
        ...acc,
        [valueFromAlert]: {
          alert_ids: [...(currentValue?.alert_ids || []), _id],
          parameters: { [paramKey]: valueFromAlert },
          endpoint_ids: [...new Set([...(currentValue?.endpoint_ids || []), agentId])],
          hosts: {
            ...currentValue?.hosts,
            [agentId]: { name: name || hostName, id: agentId },
          },
        },
      };
    }
    return acc;
  }, {});
};

export const getErrorProcessAlerts = (
  alerts: AlertWithAgent[],
  config: EndpointParams['config']
) => {
  if (!config) {
    return {};
  }
  const { overwrite, field } = config;

  return alerts.reduce((acc: Record<string, AlertsAction>, alert) => {
    const valueFromAlert: number = overwrite ? alert.process?.pid : get(alert, field);

    if (!valueFromAlert) {
      const isEntityId = !overwrite && field.includes('entity_id');
      const paramKey = isEntityId ? 'entity_id' : 'pid';
      const { _id, agent } = alert;
      const { id: agentId, name } = agent as AlertAgent;
      const hostName = alert.host?.name;

      const errorField = overwrite ? 'process.pid' : field;
      const currentValue = acc[errorField];

      return {
        ...acc,
        [errorField]: {
          alert_ids: [...(currentValue?.alert_ids || []), _id],
          parameters: { [paramKey]: `${field || 'process.pid'} not found` },
          endpoint_ids: [...new Set([...(currentValue?.endpoint_ids || []), agentId])],
          hosts: {
            ...currentValue?.hosts,
            [agentId]: { name: name || hostName, id: agentId },
          },
          error: errorField,
        },
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

export const getExecuteAlerts = (
  alerts: AlertWithAgent[],
  config: { command: string; timeout?: number }
) =>
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
      parameters: {
        command: config.command,
        timeout: config.timeout,
      },
      endpoint_ids: [...new Set([...(acc.endpoint_ids || []), agentId])],
      alert_ids: [...(acc.alert_ids || []), alert._id],
    };
  }, {} as AlertsAction);
