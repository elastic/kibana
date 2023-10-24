/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, flatMap, flatten, map, reduce } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { EndpointParamsConfig } from '../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { RuleResponseEndpointAction } from '../../../../common/api/detection_engine/model/rule_response_actions';

import type {
  Alert,
  AlertAgent,
  EndpointResponseActionAlerts,
  ResponseActionAlerts,
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
          foundFields: {
            ...(acc[agentId]?.foundFields || {}),
            ...getProcessAlerts(acc, alert, responseAction.params.config, false),
          },
          notFoundFields: {
            ...(acc[agentId]?.notFoundFields || {}),
            ...getProcessAlerts(acc, alert, responseAction.params.config, true),
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

  if (command === 'kill-process' || command === 'suspend-process') {
    // TODO think if we could merge these 2 calculation of actions
    const flatAlerts = flatten(map(uniqueAlerts, (agent) => flatMap(agent.foundFields)));
    const flatAlertsWithErrors = flatten(
      map(uniqueAlerts, (agent) => flatMap(agent.notFoundFields))
    );
    const actions = each(flatAlerts, async (alert) => {
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
    });

    const errorActions = each(flatAlertsWithErrors, async (alert, test) => {
      return endpointAppContextService.getActionCreateService().createActionFromAlert(
        {
          hosts: alert.hosts,
          endpoint_ids: [alert.agentId],
          alert_ids: alert.alertIds,
          error: alert.error,
          parameters: alert.parameters,
          ...commonData,
        },
        [alert.agentId]
      );
    });
    return Promise.all([actions, errorActions]);
  }
};

const getProcessAlerts = (
  acc: EndpointResponseActionAlerts,
  alert: Alert,
  config?: EndpointParamsConfig,
  checkErrors?: boolean
) => {
  if (!config) {
    return {};
  }
  const { overwrite, field } = config;
  const valueFromAlert = overwrite ? alert.process?.pid : alert[field];
  const isEntityId = field.includes('entity_id');
  const key = isEntityId ? 'entity_id' : 'pid';
  const { _id, agent } = alert;
  const { id: agentId, name } = agent as AlertAgent;
  if (valueFromAlert && !checkErrors) {
    return {
      [valueFromAlert]: {
        alertIds: [...(acc?.[agentId]?.foundFields?.[valueFromAlert]?.alertIds || []), _id],
        parameters: {
          [key]: valueFromAlert,
        },
        agentId,
        hosts: {
          [agentId]: {
            name: name || '',
          },
        },
      },
    };
  } else if (!valueFromAlert && checkErrors) {
    const errorField = overwrite ? 'process.pid' : field;
    return {
      [errorField]: {
        alertIds: [...(acc?.[agentId]?.notFoundFields?.[field]?.alertIds || []), _id],
        parameters: {
          [key]: `${errorField} not found`,
        },
        error: errorField,
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
