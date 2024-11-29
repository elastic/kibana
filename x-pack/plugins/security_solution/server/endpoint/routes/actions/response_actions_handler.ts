/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { createBaseActionRequestHandler } from './base_response_actions_handler';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
} from '../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../types';
import type {
  EDRActionsApiCommandNames,
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import type {
  ExecuteActionRequestBody,
  KillProcessRequestBody,
  ResponseActionGetFileRequestBody,
  ResponseActionsRequestBody,
  ScanActionRequestBody,
  SuspendProcessRequestBody,
  UploadActionApiRequestBody,
} from '../../../../common/api/endpoint';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { ResponseActionsClient } from '../../services';

export function responseActionRequestHandler<T extends EndpointActionDataParameterTypes>(
  endpointContext: EndpointAppContext,
  command: EDRActionsApiCommandNames<'endpoint'>
): RequestHandler<
  unknown,
  unknown,
  ResponseActionsRequestBody,
  SecuritySolutionRequestHandlerContext
> {
  return createBaseActionRequestHandler<'endpoint'>(
    endpointContext,
    command,
    isThirdPartyFeatureDisabled, // Feature validation
    handleActionCreation // Default action creation logic
  );
}

function isThirdPartyFeatureDisabled(
  agentType: ResponseActionAgentType | undefined,
  experimentalFeatures: EndpointAppContext['experimentalFeatures']
): boolean {
  return (
    (agentType === 'sentinel_one' && !experimentalFeatures.responseActionsSentinelOneV1Enabled) ||
    (agentType === 'crowdstrike' &&
      !experimentalFeatures.responseActionsCrowdstrikeManualHostIsolationEnabled)
  );
}

async function handleActionCreation(
  command: ResponseActionsApiCommandNames,
  body: ResponseActionsRequestBody,
  responseActionsClient: ResponseActionsClient
): Promise<ActionDetails> {
  switch (command) {
    case 'isolate':
      return responseActionsClient.isolate(body);
    case 'unisolate':
      return responseActionsClient.release(body);
    case 'running-processes':
      return responseActionsClient.runningProcesses(body);
    case 'execute':
      return responseActionsClient.execute(body as ExecuteActionRequestBody);
    case 'suspend-process':
      return responseActionsClient.suspendProcess(body as SuspendProcessRequestBody);
    case 'kill-process':
      return responseActionsClient.killProcess(body as KillProcessRequestBody);
    case 'get-file':
      return responseActionsClient.getFile(body as ResponseActionGetFileRequestBody);
    case 'upload':
      return responseActionsClient.upload(body as UploadActionApiRequestBody);
    case 'scan':
      return responseActionsClient.scan(body as ScanActionRequestBody);
    default:
      throw new CustomHttpRequestError(
        `No handler found for response action command: [${command}]`,
        501
      );
  }
}
