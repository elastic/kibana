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
  EndpointActionData,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  ExecuteActionRequestBody,
  UploadActionApiRequestBody,
} from '../../../../../../common/api/endpoint';

/**
 * Additional options for response action methods that fall outside of the Request Body
 */
export interface CommonResponseActionMethodOptions
  /**
   * Host names are sometime passed in from the Alert when running in automated
   * mode so that it gets stored with the action request if the host is no
   * longer running elastic defend
   */
  extends Pick<EndpointActionData, 'hosts'> {
  /** Used when invoked from rules */
  ruleId?: string;
  /** Used when invoked from rules */
  ruleName?: string;
  /**
   * If defined, then action request will be created with an Error. Note that teh action will
   * not be dispatched to Fleet or an external EDR system if this value is defined
   */
  error?: string;
}

/**
 * The interface required for a Response Actions provider
 */
export interface ResponseActionsClient {
  isolate: (
    actionRequest: IsolationRouteRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails>;

  release: (
    actionRequest: IsolationRouteRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails>;

  killProcess: (
    actionRequest: KillOrSuspendProcessRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  suspendProcess: (
    actionRequest: KillOrSuspendProcessRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  runningProcesses: (
    actionRequest: GetProcessesRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<GetProcessesActionOutputContent>>;

  getFile: (
    actionRequest: ResponseActionGetFileRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>>;

  execute: (
    actionRequest: ExecuteActionRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>>;

  upload: (
    actionRequest: UploadActionApiRequestBody,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>>;
}
