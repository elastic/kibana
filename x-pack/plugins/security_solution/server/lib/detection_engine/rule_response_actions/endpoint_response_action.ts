/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, map, uniq } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type {
  RuleResponseEndpointAction,
  ProcessesParams,
} from '../../../../common/api/detection_engine';
import type { KillOrSuspendProcessRequestBody } from '../../../../common/endpoint/types';
import { getErrorProcessAlerts, getIsolateAlerts, getProcessAlerts } from './utils';
import type { AlertsAction, ResponseActionAlerts } from './types';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';

const NOOP = () => {};

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
  const agentIds = uniq(map(alerts, 'agent.id'));
  const errors: string[] = [];
  const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
    agentType: 'endpoint',
    username: 'unknown',
  });

  const automatedProcessActionsEnabled =
    endpointAppContextService.experimentalFeatures.automatedProcessActionsEnabled;

  const processResponseActionClientError = (err: Error, endpointIds: string[]): Promise<void> => {
    errors.push(
      `attempt to isolate host [${endpointIds.join(', ')}] returned error: ${err.message}`
    );

    return Promise.resolve();
  };

  logger.info(`${logMsgPrefix} will create a total of [${agentIds.length}] [${command}] action(s)`);

  let response: Promise<void> = Promise.resolve();

  switch (command) {
    case 'isolate':
      response = Promise.all(
        // TODO:PT should this be throttled?
        Object.values(getIsolateAlerts(alerts)).map(
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ({ endpoint_ids, alert_ids, parameters, error, hosts }: AlertsAction) => {
            return responseActionsClient
              .isolate(
                {
                  endpoint_ids,
                  alert_ids,
                  parameters,
                  comment,
                  agent_type: 'endpoint',
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
              })
              .then(NOOP);
          }
        )
      ).then(NOOP);

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
                return responseActionsClient[
                  command === 'kill-process' ? 'killProcess' : 'suspendProcess'
                ](
                  {
                    agent_type: 'endpoint',
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
                )
                  .catch((err) => {
                    return processResponseActionClientError(err, endpoint_ids);
                  })
                  .then(NOOP);
              }
            );
          });
        };

        const foundFields = getProcessAlerts(alerts, processesActionRuleConfig);
        const notFoundField = getErrorProcessAlerts(alerts, processesActionRuleConfig);

        // TODO:PT does this need to be throttled?
        const processActions = createProcessActionFromAlerts(foundFields);
        const processActionsWithError = createProcessActionFromAlerts(notFoundField);

        response = Promise.all([processActions, processActionsWithError]).then(NOOP);
      }

      break;

    default:
      errors.push(`response action [${command}] is not supported`);
  }

  if (errors.length !== 0) {
    logger.error(
      `${logMsgPrefix} The following [${errors.length}] errors were encountered:\n${errors.join(
        '\n'
      )}`
    );
  }

  return response;
};

// import type { ExperimentalFeatures } from '../../../../common';
// import { isIsolateAction, isProcessesAction } from './endpoint_params_type_guards';
// import type { RuleResponseEndpointAction } from '../../../../common/api/detection_engine';
// import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
// import { getProcessAlerts, getIsolateAlerts, getErrorProcessAlerts } from './utils';
//
// import type { ResponseActionAlerts, AlertsAction } from './types';
//
// export const endpointResponseActionFromTomaszPR = (
//   responseAction: RuleResponseEndpointAction,
//   endpointAppContextService: EndpointAppContextService,
//   { alerts }: ResponseActionAlerts,
//   experimentalFeatures: ExperimentalFeatures
// ) => {
//   const { comment, command } = responseAction.params;
//
//   const commonData = {
//     comment,
//     command,
//     rule_id: alerts[0][ALERT_RULE_UUID],
//     rule_name: alerts[0][ALERT_RULE_NAME],
//     agent_type: 'endpoint' as const,
//   };
//
//   if (isIsolateAction(responseAction.params)) {
//     const alertsPerAgent = getIsolateAlerts(alerts);
//     each(alertsPerAgent, (actionPayload) => {
//       return endpointAppContextService.getActionCreateService().createActionFromAlert(
//         {
//           ...actionPayload,
//           ...commonData,
//         },
//         actionPayload.endpoint_ids
//       );
//     });
//   }
//
//   const automatedProcessActionsEnabled = experimentalFeatures?.automatedProcessActionsEnabled;
//
//   if (automatedProcessActionsEnabled) {
//     const createProcessActionFromAlerts = (
//       actionAlerts: Record<string, Record<string, AlertsAction>>
//     ) => {
//       const createAction = async (alert: AlertsAction) => {
//         const { hosts, parameters, error } = alert;
//
//         const actionData = {
//           hosts,
//           endpoint_ids: alert.endpoint_ids,
//           alert_ids: alert.alert_ids,
//           error,
//           parameters,
//           ...commonData,
//         };
//
//         return endpointAppContextService
//           .getActionCreateService()
//           .createActionFromAlert(actionData, alert.endpoint_ids);
//       };
//       return each(actionAlerts, (actionPerAgent) => {
//         return each(actionPerAgent, createAction);
//       });
//     };
//
//     if (isProcessesAction(responseAction.params)) {
//       const foundFields = getProcessAlerts(alerts, responseAction.params.config);
//       const notFoundField = getErrorProcessAlerts(alerts, responseAction.params.config);
//
//       const processActions = createProcessActionFromAlerts(foundFields);
//       const processActionsWithError = createProcessActionFromAlerts(notFoundField);
//
//       return Promise.all([processActions, processActionsWithError]);
//     }
//   }
// };
