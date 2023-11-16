/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsolationRouteRequestBody } from '../../../../common/api/endpoint';
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
} from '../../../../common/endpoint/types';

/**
 * The interface required for a Response Actions provider
 */
export interface ResponseActionsProvider {
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

  runningProcesses: () => Promise<ActionDetails<GetProcessesActionOutputContent>>;

  getFile: () => Promise<
    ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>
  >;

  execute: () => Promise<
    ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>
  >;

  upload: () => Promise<
    ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>
  >;
}
