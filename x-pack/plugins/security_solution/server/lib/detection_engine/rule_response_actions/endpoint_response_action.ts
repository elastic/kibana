/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, flatMap, flatten, map, reduce } from 'lodash';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { RuleResponseEndpointAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { Alert, AlertAgent, AlertsWithAgentType } from './types';

type UniqueAlert = Record<
  string,
  Record<
    string,
    {
      alertIds: string[];
      agentId: string;
      hosts: Record<string, { name: string }>;
      parameters: Record<string, unknown>;
    }
  >
>;

const getProcessAlerts = (acc: UniqueAlert, alert: Alert) => {
  const pid = alert.process?.pid;
  const { _id, agent } = alert;
  const { id: agentId, name } = agent as AlertAgent;

  if (pid) {
    return {
      [pid]: {
        alertIds: [...(acc?.[agentId]?.[pid]?.alertIds || []), _id],
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

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts, alertIds, agentIds, ruleId, ruleName, hosts }: AlertsWithAgentType
) => {
  const uniqueAlerts = reduce(
    alerts,
    (acc: UniqueAlert, alert) => {
      if (alert.agent?.id) {
        return {
          ...acc,
          [alert.agent.id]: {
            ...acc[alert.agent.id],
            ...getProcessAlerts(acc, alert),
          },
        };
      }
      return acc;
    },
    {}
  );
  const { comment, command } = responseAction.params;

  const commonData = {
    comment,
    command,
    rule_id: ruleId,
    rule_name: ruleName,
  };
  if (command === 'isolate') {
    return Promise.all(
      each(agentIds, async (agent) =>
        endpointAppContextService.getActionCreateService().createActionFromAlert({
          hosts: { [agent]: hosts[agent] },
          endpoint_ids: [agent],
          alert_ids: alertIds,
          ...commonData,
        })
      )
    );
  }

  if (command === 'kill-process' || command === 'suspend-process') {
    const flatAlerts = flatten(map(uniqueAlerts, (agent) => flatMap(agent)));
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
