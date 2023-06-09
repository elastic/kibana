/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import { DEFAULT_EXECUTE_ACTION_TIMEOUT } from '../../../../../common/endpoint/service/response_actions/constants';

import type {
  ActionDetails,
  EndpointAction,
  HostMetadata,
  LogsEndpointAction,
  ResponseActionsExecuteParameters,
  EndpointActionDataParameterTypes,
} from '../../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../../types';
import type { FeatureKeys } from '../../feature_usage';
import { getActionDetailsById } from '..';
import type { ActionCreateService, CreateActionMetadata, CreateActionPayload } from './types';
import { updateCases } from './update_cases';
import { writeActionToIndices } from './write_action_to_indices';
import { addErrorsToActionIfAny } from './action_errors';

const commandToFeatureKeyMap = new Map<ResponseActionsApiCommandNames, FeatureKeys>([
  ['isolate', 'HOST_ISOLATION'],
  ['unisolate', 'HOST_ISOLATION'],
  ['kill-process', 'KILL_PROCESS'],
  ['suspend-process', 'SUSPEND_PROCESS'],
  ['running-processes', 'RUNNING_PROCESSES'],
  ['get-file', 'GET_FILE'],
  ['execute', 'EXECUTE'],
]);

const returnActionIdCommands: ResponseActionsApiCommandNames[] = ['isolate', 'unisolate'];

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

export const actionCreateService = (
  esClient: ElasticsearchClient,
  endpointContext: EndpointAppContext
): ActionCreateService => {
  const createActionFromAlert = async (payload: CreateActionPayload): Promise<ActionDetails> => {
    return createAction({ ...payload }, { minimumLicenseRequired: 'enterprise' });
  };

  const createAction = async <
    TOutputContent extends object = object,
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
  >(
    payload: CreateActionPayload,
    { casesClient, minimumLicenseRequired = 'basic' }: CreateActionMetadata
  ): Promise<ActionDetails<TOutputContent, TParameters>> => {
    const featureKey = commandToFeatureKeyMap.get(payload.command) as FeatureKeys;
    if (featureKey) {
      endpointContext.service.getFeatureUsageService().notifyUsage(featureKey);
    }

    const licenseService = endpointContext.service.getLicenseService();
    const logger = endpointContext.logFactory.get('hostIsolation');

    // fetch the Agent IDs to send the commands to
    const endpointIDs = [...new Set(payload.endpoint_ids)]; // dedupe
    const endpointData = await endpointContext.service
      .getEndpointMetadataService()
      .getMetadataForEndpoints(esClient, endpointIDs);

    const agents = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);

    // create an Action ID and dispatch it to ES & Fleet Server
    const actionID = uuidv4();
    // const alertActionError = checkForAlertErrors();

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

    await writeActionToIndices({
      agents,
      doc,
      esClient,
      endpointContext,
      logger,
      payload,
    });

    await updateCases({ casesClient, payload, endpointData });

    const actionId = returnActionIdCommands.includes(payload.command) ? { action: actionID } : {};
    const data = await getActionDetailsById(
      esClient,
      endpointContext.service.getEndpointMetadataService(),
      actionID
    );

    return {
      ...actionId,
      ...data,
    } as ActionDetails<TOutputContent, TParameters>;
  };

  return {
    createAction,
    createActionFromAlert,
  };
};

const addRuleInfoToAction = (payload: CreateActionPayload) => {
  if (payload.rule_id && payload.rule_name) {
    return { rule: { id: payload.rule_id, name: payload.rule_name } };
  }
};
