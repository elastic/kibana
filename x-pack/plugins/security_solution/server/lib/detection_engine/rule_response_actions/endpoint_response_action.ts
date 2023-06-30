/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, map, uniq } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { ResponseActionAlerts } from './types';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { RuleResponseEndpointAction } from '../../../../common/api/detection_engine/model/rule_response_actions';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
) => {
  const { comment, command } = responseAction.params;
  const commonData = {
    comment,
    command,
    rule_id: alerts[0][ALERT_RULE_UUID],
    rule_name: alerts[0][ALERT_RULE_NAME],
  };
  const agentIds = uniq(map(alerts, 'agent.id'));
  const alertIds = map(alerts, '_id');

  const hosts = alerts.reduce<Record<string, string>>((acc, alert) => {
    if (alert.agent?.name && !acc[alert.agent.id]) {
      acc[alert.agent.id] = alert.agent.name;
    }
    return acc;
  }, {});
  return Promise.all(
    each(agentIds, async (agent) =>
      endpointAppContextService.getActionCreateService().createActionFromAlert(
        {
          hosts: {
            [agent]: {
              name: hosts[agent],
            },
          },
          endpoint_ids: [agent],
          alert_ids: alertIds,
          ...commonData,
        },
        [agent]
      )
    )
  );
};
