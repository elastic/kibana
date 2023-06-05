/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, map, reduce, uniq } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { ResponseActionAlerts } from './types';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { RuleResponseEndpointAction } from '../../../../common/detection_engine/rule_response_actions/schemas';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts: filteredAlerts }: ResponseActionAlerts
) => {
  const { comment, command } = responseAction.params;
  const commonData = {
    comment,
    command,
    rule_id: filteredAlerts[0][ALERT_RULE_UUID],
    rule_name: filteredAlerts[0][ALERT_RULE_NAME],
  };
  const agentIds = uniq(map(filteredAlerts, 'agent.id'));
  const alertIds = map(filteredAlerts, '_id');

  const hosts = reduce(
    filteredAlerts,
    (acc: Record<string, string>, alert) => ({
      ...acc,
      ...(alert.agent?.name ? { [alert.agent.id]: alert.agent?.name || '' } : {}),
    }),
    {}
  );

  return Promise.all(
    each(agentIds, async (agent) =>
      endpointAppContextService.getActionCreateService().createActionFromAlert({
        hosts: {
          [agent]: {
            name: hosts[agent],
          },
        },
        endpoint_ids: [agent],
        alert_ids: alertIds,
        ...commonData,
      })
    )
  );
};
