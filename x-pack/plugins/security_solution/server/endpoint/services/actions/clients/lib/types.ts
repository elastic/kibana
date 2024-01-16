/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionDetails,
  KillOrSuspendProcessRequestBody,
  KillProcessActionOutputContent,
  ResponseActionParametersWithPidOrEntityId,
  SuspendProcessActionOutputContent,
  GetProcessesActionOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  ExecuteActionRequestBody,
  UploadActionApiRequestBody,
} from '../../../../../../common/api/endpoint';

/**
 * The interface required for a Response Actions provider
 */
export interface ResponseActionsClient {
  isolate: (options: IsolationRouteRequestBody) => Promise<ActionDetails>;

  release: (options: IsolationRouteRequestBody) => Promise<ActionDetails>;

  killProcess: (
    options: KillOrSuspendProcessRequestBody
  ) => Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  suspendProcess: (
    options: KillOrSuspendProcessRequestBody
  ) => Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  runningProcesses: (
    options: GetProcessesRequestBody
  ) => Promise<ActionDetails<GetProcessesActionOutputContent>>;

  getFile: (
    options: ResponseActionGetFileRequestBody
  ) => Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>>;

  execute: (
    options: ExecuteActionRequestBody
  ) => Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>>;

  upload: (
    options: UploadActionApiRequestBody
  ) => Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>>;
}
