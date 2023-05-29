/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, flatMap, flatten, map, reduce } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { RuleResponseEndpointAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { Alert, AlertAgent, ResponseActionsAlerts, ResponseActionAlerts } from './types';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
) => {
  const { comment, command } = responseAction.params;
  const uniqueAlerts = reduce(
    alerts,
    (acc: ResponseActionsAlerts, alert) => {
      return {
        ...acc,
        [alert.agent.id]: {
          ...acc[alert.agent.id],
          agent: {
            ...acc[alert.agent.id]?.agent,
            id: alert.agent.id,
            name: alert.agent.name,
          },
          pids: {
            ...(acc[alert.agent.id]?.pids || {}),
            ...getProcessAlerts(acc, alert),
          },
          hosts: {
            ...(acc[alert.agent.id]?.hosts || {}),
            [alert.agent.id]: {
              name: alert.agent?.name
                ? alert.agent.name
                : acc[alert.agent.id]?.hosts[alert.agent.id].name ?? '',
            },
          },
          alertIds: [...(acc[alert.agent.id]?.alertIds || []), alert._id],
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

  if (command === 'isolate') {
    return Promise.all(
      map(uniqueAlerts, async (alertPerAgent) =>
        endpointAppContextService.getActionCreateService().createActionFromAlert({
          hosts: alertPerAgent.hosts,
          endpoint_ids: [alertPerAgent.agent.id],
          alert_ids: alertPerAgent.alertIds,
          ...commonData,
        })
      )
    );
  }

  if (command === 'kill-process' || command === 'suspend-process') {
    const flatAlerts = flatten(map(uniqueAlerts, (agent) => flatMap(agent.pids)));

    return Promise.all(
      each(flatAlerts, async (alert) => {
        return endpointAppContextService.getActionCreateService().createActionFromAlert({
          hosts: alert.hosts,
          endpoint_ids: [alert.agentId],
          alert_ids: alert.alertIds,
          parameters: alert.parameters,
          ...commonData,
        });
      })
    );
  }
};
const getProcessAlerts = (acc: ResponseActionsAlerts, alert: Alert) => {
  const pid = alert.process?.pid;
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
