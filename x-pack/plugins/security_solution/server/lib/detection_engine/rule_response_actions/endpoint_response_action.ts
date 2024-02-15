/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { stringify } from '../../../endpoint/utils/stringify';
import type {
  RuleResponseEndpointAction,
  ProcessesParams,
} from '../../../../common/api/detection_engine';
import type { KillOrSuspendProcessRequestBody } from '../../../../common/endpoint/types';
import { getErrorProcessAlerts, getIsolateAlerts, getProcessAlerts } from './utils';
import type { AlertsAction, ResponseActionAlerts } from './types';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';

export const endpointResponseAction = async (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
): Promise<void> => {
  const logger = endpointAppContextService.createLogger(
    'ruleExecution',
    'automatedResponseActions'
  );
  const ruleId = alerts[0][ALERT_RULE_UUID];
  const ruleName = alerts[0][ALERT_RULE_NAME];
  const logMsgPrefix = `Rule [${ruleName}][${ruleId}]:`;
  const { comment, command } = responseAction.params;
  const errors: string[] = [];
  const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
    agentType: 'endpoint',
    username: 'unknown',
  });

  const automatedProcessActionsEnabled =
    endpointAppContextService.experimentalFeatures.automatedProcessActionsEnabled;

  const processResponseActionClientError = (err: Error, endpointIds: string[]): Promise<void> => {
    errors.push(
      `attempt to [${command}] host IDs [${endpointIds.join(', ')}] returned error: ${err.message}`
    );

    return Promise.resolve();
  };

  const response: Array<Promise<unknown>> = [];

  switch (command) {
    case 'isolate':
      response.push(
        Promise.all(
          Object.values(getIsolateAlerts(alerts)).map(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            ({ endpoint_ids, alert_ids, parameters, error, hosts }: AlertsAction) => {
              logger.info(
                `${logMsgPrefix} [${command}] [${endpoint_ids.length}] agent(s): ${stringify(
                  endpoint_ids
                )}`
              );

              return responseActionsClient
                .isolate(
                  {
                    endpoint_ids,
                    alert_ids,
                    parameters,
                    comment,
                  },
                  {
                    hosts,
                    ruleName,
                    ruleId,
                    error,
                  }
                )
                .catch((err) => {
                  return processResponseActionClientError(err, endpoint_ids);
                });
            }
          )
        )
      );

      break;

    case 'suspend-process':
    case 'kill-process':
      if (automatedProcessActionsEnabled) {
        const processesActionRuleConfig: ProcessesParams['config'] = (
          responseAction.params as ProcessesParams
        ).config;

        const createProcessActionFromAlerts = (
          actionAlerts: Record<string, Record<string, AlertsAction>>
        ) => {
          return each(actionAlerts, (actionPerAgent) => {
            return each(
              actionPerAgent,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              ({ endpoint_ids, alert_ids, parameters, error, hosts }: AlertsAction) => {
                logger.info(
                  `${logMsgPrefix} [${command}] [${endpoint_ids.length}] agent(s): ${stringify(
                    endpoint_ids
                  )}`
                );

                return responseActionsClient[
                  command === 'kill-process' ? 'killProcess' : 'suspendProcess'
                ](
                  {
                    comment,
                    endpoint_ids,
                    alert_ids,
                    parameters: parameters as KillOrSuspendProcessRequestBody['parameters'],
                  },
                  {
                    hosts,
                    ruleId,
                    ruleName,
                    error,
                  }
                ).catch((err) => {
                  return processResponseActionClientError(err, endpoint_ids);
                });
              }
            );
          });
        };

        const foundFields = getProcessAlerts(alerts, processesActionRuleConfig);
        const notFoundField = getErrorProcessAlerts(alerts, processesActionRuleConfig);
        const processActions = createProcessActionFromAlerts(foundFields);
        const processActionsWithError = createProcessActionFromAlerts(notFoundField);

        response.push(Promise.all([processActions, processActionsWithError]));
      }

      break;

    default:
      errors.push(`response action [${command}] is not supported`);
  }

  return Promise.all(response)
    .then(() => {})
    .finally(() => {
      if (errors.length !== 0) {
        logger.error(
          `${logMsgPrefix} The following [${errors.length}] errors were encountered:\n${errors.join(
            '\n'
          )}`
        );
      }
    });
};
