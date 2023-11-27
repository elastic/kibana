/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
import type {
  ActionDetails,
  GetProcessesActionOutputContent,
  KillOrSuspendProcessRequestBody,
  KillProcessActionOutputContent,
  ResponseActionExecuteOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionParametersWithPidOrEntityId,
  ResponseActionsExecuteParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  SuspendProcessActionOutputContent,
} from '../../../../../common/endpoint/types';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
} from '../../../../../common/api/endpoint';
import { ResponseActionsClientImpl } from '../../../lib/response_actions/base_response_actions_client';

const createNotSupportedError = () => {
  // Throw a 405 Method Not Allowed
  return new CustomHttpRequestError(`Action is not currently supported`, 405);
};

export class SentinelOneActionsClient extends ResponseActionsClientImpl {
  isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    throw createNotSupportedError();
  }

  release(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    throw createNotSupportedError();
  }

  killProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw createNotSupportedError();
  }

  suspendProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw createNotSupportedError();
  }

  runningProcesses(
    options: GetProcessesRequestBody
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    throw createNotSupportedError();
  }

  getFile(
    options: ResponseActionGetFileRequestBody
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    throw createNotSupportedError();
  }

  execute(
    options: ExecuteActionRequestBody
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>> {
    throw createNotSupportedError();
  }

  upload(
    options: UploadActionApiRequestBody
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>> {
    throw createNotSupportedError();
  }
}
