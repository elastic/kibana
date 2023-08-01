/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, flatMap, flatten, map, reduce } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type {
  Alert,
  AlertAgent,
  EndpointResponseActionAlerts,
  ResponseActionAlerts,
  RuleResponseEndpointAction,
} from './types';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
) => {
  const { comment, command } = responseAction.params;
  const uniqueAlerts = reduce(
    alerts,
    (acc: EndpointResponseActionAlerts, alert) => {
      const agentId = alert.agent.id;
      const agentName = alert.agent?.name;
      return {
        ...acc,
        [agentId]: {
          ...acc[agentId],
          agent: {
            ...acc[agentId]?.agent,
            id: agentId,
            name: agentName,
          },
          pids: {
            ...(acc[agentId]?.pids || {}),
            ...getProcessAlerts(acc, alert, responseAction.params.config),
          },
          hosts: {
            ...(acc[agentId]?.hosts || {}),
            [agentId]: {
              name: agentName ? agentName : acc[agentId]?.hosts[agentId].name ?? '',
            },
          },
          alertIds: [...(acc[agentId]?.alertIds || []), alert._id],
        },
      };
    },
    {}
  );

  const commonData = {
    comment,
    command,
    rule_id: alerts[0][ALERT_RULE_UUID],
    rule_name: alerts[0][ALERT_RULE_NAME],
  };

  if (command === 'isolate' || command === 'running-processes') {
    return Promise.all(
      map(uniqueAlerts, async (alertPerAgent) =>
        endpointAppContextService.getActionCreateService().createActionFromAlert(
          {
            hosts: alertPerAgent.hosts,
            endpoint_ids: [alertPerAgent.agent.id],
            alert_ids: alertPerAgent.alertIds,
            ...commonData,
          },
          [alertPerAgent.agent.id]
        )
      )
    );
  }

  if (command === 'kill-process' || command === 'suspend-process') {
    const flatAlerts = flatten(map(uniqueAlerts, (agent) => flatMap(agent.pids)));

    return Promise.all(
      each(flatAlerts, async (alert) => {
        return endpointAppContextService.getActionCreateService().createActionFromAlert(
          {
            hosts: alert.hosts,
            endpoint_ids: [alert.agentId],
            alert_ids: alert.alertIds,
            parameters: alert.parameters,
            ...commonData,
          },
          [alert.agentId]
        );
      })
    );
  }
};
const getProcessAlerts = (
  acc: EndpointResponseActionAlerts,
  alert: Alert,
  config?: EndpointParamsConfig
) => {
  const pidField = (config?.parent && alert.process?.parent?.pid) ?? alert.process?.pid;
  const pid = (config?.field ? alert[config.field] : pidField) as string;
  const { _id, agent } = alert;
  const { id: agentId, name } = agent as AlertAgent;

  if (pid) {
    return {
      [pid]: {
        alertIds: [...(acc?.[agentId]?.pids?.[pid]?.alertIds || []), _id],
        parameters: {
          pid,
        },
        agentId,
        hosts: {
          [agentId]: {
            name: name || '',
          },
        },
      },
    };
  }
  return {};
};
