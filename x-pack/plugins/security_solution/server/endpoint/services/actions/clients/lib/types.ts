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
  LogsEndpointActionResponse,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  ExecuteActionRequestBody,
  UploadActionApiRequestBody,
  BaseActionRequestBody,
} from '../../../../../../common/api/endpoint';

type OmitUnsupportedAttributes<T extends BaseActionRequestBody> = Omit<
  T,
  // We don't need agent type in the Response Action client because each client is initialized for only 1 agent type
  'agent_type'
>;

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

export interface ProcessPendingActionsMethodOptions {
  addToQueue: (...docs: LogsEndpointActionResponse[]) => void;
  abortSignal: AbortSignal;
}

/**
 * The interface required for a Response Actions provider
 */
export interface ResponseActionsClient {
  isolate: (
    actionRequest: OmitUnsupportedAttributes<IsolationRouteRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails>;

  release: (
    actionRequest: OmitUnsupportedAttributes<IsolationRouteRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails>;

  killProcess: (
    actionRequest: OmitUnsupportedAttributes<KillOrSuspendProcessRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  suspendProcess: (
    actionRequest: OmitUnsupportedAttributes<KillOrSuspendProcessRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  runningProcesses: (
    actionRequest: OmitUnsupportedAttributes<GetProcessesRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<GetProcessesActionOutputContent>>;

  getFile: (
    actionRequest: OmitUnsupportedAttributes<ResponseActionGetFileRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>>;

  execute: (
    actionRequest: OmitUnsupportedAttributes<ExecuteActionRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>>;

  upload: (
    actionRequest: OmitUnsupportedAttributes<UploadActionApiRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>>;

  /**
   * Will fetch all pending response actions and check to see if they can be Completed. If so, then
   * a Response record will be added to the queue to be written to the responses index.
   *
   * **NOTE**: the actual write to the index is done by the `QueueProcessor` instance - which at
   * the time of this writing, is being controlled by the background task.
   */
  processPendingActions: (options: ProcessPendingActionsMethodOptions) => Promise<void>;
}
