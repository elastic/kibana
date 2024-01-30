/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, map, uniq } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { stringify } from '../../../endpoint/utils/stringify';
import type { ResponseActionAlerts } from './types';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { RuleResponseEndpointAction } from '../../../../common/api/detection_engine/model/rule_response_actions';

export const endpointResponseAction = async (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
): Promise<void> => {
  const logger = endpointAppContextService.createLogger('EndpointAutomatedRespActions');
  const ruleId = alerts[0][ALERT_RULE_UUID];
  const ruleName = alerts[0][ALERT_RULE_NAME];
  const logMsgPrefix = `Rule [${ruleName}][${ruleId}] Automated Response Actions:`;
  const { comment, command } = responseAction.params;
  const commonData = { comment, command };
  const agentIds = uniq(map(alerts, 'agent.id'));
  const alertIds = map(alerts, '_id');
  const errors: string[] = [];
  const responseActionsClient =
    endpointAppContextService.getInternalResponseActionsClient('endpoint');
  const hosts = alerts.reduce<Record<string, string>>((acc, alert) => {
    if (alert.agent?.name && !acc[alert.agent.id]) {
      acc[alert.agent.id] = alert.agent.name;
    }
    return acc;
  }, {});

  logger.info(`${logMsgPrefix} will create a total of [${agentIds.length}] actions`);
  logger.debug(`${logMsgPrefix} list of hosts:\n${stringify(hosts)}`);

  await Promise.all(
    each(agentIds, async (agent) => {
      switch (command) {
        case 'isolate':
          return responseActionsClient
            .isolate(
              {
                agent_type: 'endpoint',
                endpoint_ids: [agent],
                alert_ids: alertIds,
                ...commonData,
              },
              {
                hosts: {
                  [agent]: {
                    name: hosts[agent],
                  },
                },
                ruleName,
                ruleId,
              }
            )
            .catch((err) => {
              errors.push(`attempt to isolate host returned error: ${err.message}`);
              // Don't fail the loop/Promise and allow others to be processed
              return Promise.resolve();
            });

        default:
          errors.push(
            `response action [${command}] is not supported (Agent id: [${agent}] Host name: [${hosts[agent]}])`
          );
          // Don't fail the loop/Promise and allow others to be processed
          return Promise.resolve();
      }
    })
  );

  if (errors.length !== 0) {
    logger.error(
      `${logMsgPrefix} The following [${errors.length}] errors were encountered:\n${errors.join(
        '\n'
      )}`
    );
  }
};
