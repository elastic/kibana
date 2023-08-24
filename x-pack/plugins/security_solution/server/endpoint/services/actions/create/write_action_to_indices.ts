/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import moment from 'moment';
import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import type { FleetActionRequest } from '@kbn/fleet-plugin/server/services/actions/types';
import { DEFAULT_EXECUTE_ACTION_TIMEOUT } from '../../../../../common/endpoint/service/response_actions/constants';
import {
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_DS,
  failedFleetActionErrorCode,
} from '../../../../../common/endpoint/constants';
import type {
  EndpointAction,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ResponseActionsExecuteParameters,
} from '../../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../../types';
import { doLogsEndpointActionDsExists, wrapErrorIfNeeded } from '../../../utils';
import { addErrorsToActionIfAny } from './action_errors';
import type { CreateActionPayload } from './types';

export const writeActionToIndices = async ({
  actionID,
  agents,
  esClient,
  endpointContext,
  minimumLicenseRequired,
  payload,
}: {
  actionID: string;
  agents: string[];
  esClient: ElasticsearchClient;
  endpointContext: EndpointAppContext;
  minimumLicenseRequired: LicenseType;
  payload: CreateActionPayload;
}): Promise<void> => {
  const logger = endpointContext.logFactory.get('createResponseAction');
  const licenseService = endpointContext.service.getLicenseService();

  const doc: LogsEndpointAction = {
    '@timestamp': moment().toISOString(),
    agent: {
      id: payload.endpoint_ids,
    },
    EndpointActions: {
      action_id: actionID,
      expiration: moment().add(2, 'weeks').toISOString(),
      type: 'INPUT_ACTION',
      input_type: 'endpoint',
      data: {
        command: payload.command,
        comment: payload.comment ?? undefined,
        ...(payload.alert_ids ? { alert_id: payload.alert_ids } : {}),
        ...(payload.hosts ? { hosts: payload.hosts } : {}),
        parameters: getActionParameters(payload) ?? undefined,
      },
    } as Omit<EndpointAction, 'agents' | 'user_id' | '@timestamp'>,
    user: {
      id: payload.user ? payload.user.username : 'unknown',
    },
    ...addErrorsToActionIfAny({
      agents,
      licenseService,
      minimumLicenseRequired,
    }),
    ...addRuleInfoToAction(payload),
  };

  // if .logs-endpoint.actions data stream exists
  // try to create action request record in .logs-endpoint.actions DS as the current user
  // (from >= v7.16, use this check to ensure the current user has privileges to write to the new index)
  // and allow only users with superuser privileges to write to fleet indices
  const doesLogsEndpointActionsDsExist = await doLogsEndpointActionDsExists({
    esClient,
    logger,
    dataStreamName: ENDPOINT_ACTIONS_DS,
  });

  // if the new endpoint indices/data streams exists
  // write the action request to the new endpoint index
  if (doesLogsEndpointActionsDsExist) {
    const logsEndpointActionsResult = await esClient.index<LogsEndpointAction>(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        document: {
          ...doc,
          agent: {
            id: payload.endpoint_ids,
          },
        },
        refresh: 'wait_for',
      },
      { meta: true }
    );
    if (logsEndpointActionsResult.statusCode !== 201) {
      throw new Error(logsEndpointActionsResult.body.result);
    }
  }

  if (!doc.error) {
    // add signature to doc
    const fleetActionDoc = {
      ...doc.EndpointActions,
      '@timestamp': doc['@timestamp'],
      agents,
      timeout: 300, // 5 minutes
      user_id: doc.user.id,
    };
    const fleetActionDocSignature = await endpointContext.service
      .getMessageSigningService()
      .sign(fleetActionDoc);
    const signedFleetActionDoc = {
      ...fleetActionDoc,
      signed: {
        data: fleetActionDocSignature.data.toString('base64'),
        signature: fleetActionDocSignature.signature,
      },
    } as unknown as FleetActionRequest;
    // write actions to .fleet-actions index
    try {
      const fleetActionsClient = await endpointContext.service.getFleetActionsClient();
      await fleetActionsClient.create(signedFleetActionDoc);
    } catch (e) {
      // create entry in .logs-endpoint.action.responses-default data stream
      // when writing to .fleet-actions fails
      if (doesLogsEndpointActionsDsExist) {
        await createFailedActionResponseEntry({
          esClient,
          doc: {
            '@timestamp': moment().toISOString(),
            agent: doc.agent,
            EndpointActions: {
              action_id: doc.EndpointActions.action_id,
              completed_at: moment().toISOString(),
              started_at: moment().toISOString(),
              data: doc.EndpointActions.data,
            },
          },
          logger,
        });
      }

      throw e;
    }
  }
};

const createFailedActionResponseEntry = async ({
  esClient,
  doc,
  logger,
}: {
  esClient: ElasticsearchClient;
  doc: LogsEndpointActionResponse;
  logger: Logger;
}): Promise<void> => {
  try {
    await esClient.index<LogsEndpointActionResponse>({
      index: `${ENDPOINT_ACTION_RESPONSES_DS}-default`,
      document: {
        ...doc,
        error: {
          code: failedFleetActionErrorCode,
          message: 'Failed to deliver action request to fleet',
        },
      },
    });
  } catch (error) {
    logger.error(wrapErrorIfNeeded(error));
  }
};

const addRuleInfoToAction = (
  payload: CreateActionPayload
):
  | {
      rule: { id: string; name: string };
    }
  | undefined => {
  if (payload.rule_id && payload.rule_name) {
    return { rule: { id: payload.rule_id, name: payload.rule_name } };
  }
};

const getActionParameters = (
  action: CreateActionPayload
): ResponseActionsExecuteParameters | Readonly<{}> | undefined => {
  // set timeout to 4h (if not specified or when timeout is specified as 0) when command is `execute`
  if (action.command === 'execute') {
    const actionRequestParams = action.parameters as ResponseActionsExecuteParameters;
    if (typeof actionRequestParams?.timeout === 'undefined') {
      return { ...actionRequestParams, timeout: DEFAULT_EXECUTE_ACTION_TIMEOUT };
    }
    return actionRequestParams;
  }

  // for all other commands return the parameters as is
  return action.parameters ?? undefined;
};
