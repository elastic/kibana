/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { FileJSON, BaseFileMetadata, FileCompression } from '@kbn/files-plugin/common';
import type {
  ActionStatusRequestSchema,
  NoParametersRequestSchema,
  ResponseActionBodySchema,
  KillOrSuspendProcessRequestSchema,
} from '../schema/actions';
import type {
  ResponseActionStatus,
  ResponseActionsApiCommandNames,
} from '../service/response_actions/constants';

export type ISOLATION_ACTIONS = 'isolate' | 'unisolate';

/** The output provided by some of the Endpoint responses */
export interface ActionResponseOutput<TOutputContent extends object = object> {
  type: 'json' | 'text';
  content: TOutputContent;
}

export interface ProcessesEntry {
  command: string;
  pid: string;
  entity_id: string;
  user: string;
}

export interface GetProcessesActionOutputContent {
  entries: ProcessesEntry[];
}

export interface SuspendProcessActionOutputContent {
  code: string;
  command?: string;
  pid?: number;
  entity_id?: string;
}

export interface KillProcessActionOutputContent {
  code: string;
  command?: string;
  pid?: number;
  entity_id?: string;
}

export interface ResponseActionGetFileOutputContent {
  code: string;
  zip_size: number;
  /** The contents of the zip file. One entry per file */
  contents: Array<{
    path: string;
    sha256: string;
    size: number;
    file_name: string;
    type: string;
  }>;
}

export const ActivityLogItemTypes = {
  ACTION: 'action' as const,
  RESPONSE: 'response' as const,
  FLEET_ACTION: 'fleetAction' as const,
  FLEET_RESPONSE: 'fleetResponse' as const,
};

interface EcsError {
  code?: string;
  id?: string;
  message: string;
  stack_trace?: string;
  type?: string;
}

interface EndpointActionFields<
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
  TOutputContent extends object = object
> {
  action_id: string;
  data: EndpointActionData<TParameters, TOutputContent>;
}

interface ActionRequestFields {
  expiration: string;
  type: 'INPUT_ACTION';
  input_type: 'endpoint';
}

interface ActionResponseFields {
  completed_at: string;
  started_at: string;
}

/**
 * An endpoint Action created in the Endpoint's `.logs-endpoint.actions-default` index.
 * @since v7.16
 */
export interface LogsEndpointAction {
  '@timestamp': string;
  agent: {
    id: string | string[];
  };
  EndpointActions: EndpointActionFields & ActionRequestFields;
  error?: EcsError;
  user: {
    id: string;
  };
}

/**
 * An Action response written by the endpoint to the Endpoint `.logs-endpoint.action.responses` datastream
 * @since v7.16
 */
export interface LogsEndpointActionResponse<TOutputContent extends object = object> {
  '@timestamp': string;
  agent: {
    id: string | string[];
  };
  EndpointActions: ActionResponseFields & {
    action_id: string;
    // Endpoint Response documents do not have `parameters` in the `data`
    data: Pick<EndpointActionData<never, TOutputContent>, 'comment' | 'command' | 'output'>;
  };
  error?: EcsError;
}

interface ResponseActionParametersWithPid {
  pid: number;
  entity_id?: never;
}

interface ResponseActionParametersWithEntityId {
  pid?: never;
  entity_id: string;
}

export type ResponseActionParametersWithPidOrEntityId =
  | ResponseActionParametersWithPid
  | ResponseActionParametersWithEntityId;

export interface ResponseActionGetFileParameters {
  path: string;
}

export type EndpointActionDataParameterTypes =
  | undefined
  | ResponseActionParametersWithPidOrEntityId
  | ResponseActionGetFileParameters;

export interface EndpointActionData<
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
  TOutputContent extends object = object
> {
  command: ResponseActionsApiCommandNames;
  comment?: string;
  parameters?: TParameters;
  output?: ActionResponseOutput<TOutputContent>;
}

export interface FleetActionResponseData {
  endpoint?: {
    ack?: boolean;
  };
}

/**
 * And endpoint action created in Fleet's `.fleet-actions`
 */
export interface EndpointAction extends ActionRequestFields {
  action_id: string;
  '@timestamp': string;
  agents: string[];
  user_id: string;
  // the number of seconds Elastic Agent (on the host) should
  // wait to send back an action result before it will timeout
  timeout?: number;
  data: EndpointActionData;
}

export interface EndpointActionResponse {
  '@timestamp': string;
  /** The id of the action for which this response is associated with */
  action_id: string;
  /** The agent id that sent this action response */
  agent_id: string;
  /** timestamp when the action started to be processed by the Elastic Agent and/or Endpoint on the host */
  started_at: string;
  /** timestamp when the action completed processing by the Elastic Agent and/or Endpoint on the host */
  completed_at: string;
  error?: string;
  action_data: EndpointActionData;
  /* Response data from the Endpoint process -- only present in 7.16+ */
  action_response?: FleetActionResponseData;
}

export interface EndpointActivityLogAction {
  type: typeof ActivityLogItemTypes.ACTION;
  item: {
    id: string;
    data: LogsEndpointAction;
  };
}

export interface EndpointActivityLogActionResponse {
  type: typeof ActivityLogItemTypes.RESPONSE;
  item: {
    id: string;
    data: LogsEndpointActionResponse;
  };
}

export interface ActivityLogAction {
  type: typeof ActivityLogItemTypes.FLEET_ACTION;
  item: {
    // document _id
    id: string;
    // document _source
    data: EndpointAction;
  };
}
export interface ActivityLogActionResponse {
  type: typeof ActivityLogItemTypes.FLEET_RESPONSE;
  item: {
    // document id
    id: string;
    // document _source
    data: EndpointActionResponse;
  };
}

/**
 * One of the possible Response Action Log entry - Either a Fleet Action request, Fleet action response,
 * Endpoint action request and/or endpoint action response.
 */
export type ActivityLogEntry =
  | ActivityLogAction
  | ActivityLogActionResponse
  | EndpointActivityLogAction
  | EndpointActivityLogActionResponse;

export interface ActivityLog {
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  data: ActivityLogEntry[];
}

export type HostIsolationRequestBody = TypeOf<typeof NoParametersRequestSchema.body>;

export type ResponseActionRequestBody = TypeOf<typeof ResponseActionBodySchema>;

export type KillOrSuspendProcessRequestBody = TypeOf<typeof KillOrSuspendProcessRequestSchema.body>;

export interface HostIsolationResponse {
  action: string;
}

export type ProcessesRequestBody = TypeOf<typeof NoParametersRequestSchema.body>;
export interface ResponseActionApiResponse<TOutput extends object = object> {
  action?: string;
  data: ActionDetails<TOutput>;
}

export interface EndpointPendingActions {
  agent_id: string;
  pending_actions: {
    /** Number of actions pending for each type. The `key` could be one of the `RESPONSE_ACTION_COMMANDS` values. */
    [key: string]: number;
  };
}

export interface PendingActionsResponse {
  data: EndpointPendingActions[];
}

export type PendingActionsRequestQuery = TypeOf<typeof ActionStatusRequestSchema.query>;

export interface ActionDetails<
  TOutputContent extends object = object,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> {
  /** The action id */
  id: string;
  /**
   * The Endpoint ID (and fleet agent ID - they are the same) for which the action was created for.
   * This is an Array because the action could have been sent to multiple endpoints.
   */
  agents: string[];
  /**
   * A map of `Agent ID`'s to which the action was sent whose value contains more
   * information about the host (currently the host name only).
   */
  hosts: Record<string, { name: string }>;
  /**
   * The Endpoint type of action (ex. `isolate`, `release`) that is being requested to be
   * performed on the endpoint
   */
  command: ResponseActionsApiCommandNames;
  /**
   * Will be set to true only if action is not yet completed and elapsed time has exceeded
   * the request's expiration date
   */
  isExpired: boolean;
  /** Action has been completed */
  isCompleted: boolean;
  /** If the action was successful */
  wasSuccessful: boolean;
  /** Any errors encountered if `wasSuccessful` is `false` */
  errors: undefined | string[];
  /** The date when the initial action request was submitted */
  startedAt: string;
  /** The date when the action was completed (a response by the endpoint (not fleet) was received) */
  completedAt: string | undefined;
  /** The output data from an action stored in an object where the key is the agent id */
  outputs?: Record<string, ActionResponseOutput<TOutputContent>>;
  /**
   * A map by Agent ID holding information about the action for the specific agent.
   * Helpful when action is sent to multiple agents
   */
  agentState: Record<
    string,
    {
      isCompleted: boolean;
      wasSuccessful: boolean;
      errors: undefined | string[];
      completedAt: string | undefined;
    }
  >;
  /**  action status */
  status: ResponseActionStatus;
  /** user that created the action */
  createdBy: string;
  /** comment submitted with action */
  comment?: string;
  /** parameters submitted with action */
  parameters?: TParameters;
}

export interface ActionDetailsApiResponse<
  TOutputType extends object = object,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> {
  data: ActionDetails<TOutputType, TParameters>;
}
export interface ActionListApiResponse {
  page: number | undefined;
  pageSize: number | undefined;
  startDate: string | undefined;
  elasticAgentIds: string[] | undefined;
  endDate: string | undefined;
  userIds: string[] | undefined; // users that requested the actions
  commands: string[] | undefined; // type of actions
  /**
   * The `outputs` is not currently part of the list response due to possibly large amounts of
   * data, especially for cases (in the future) where we might support actions being sent to
   * multiple agents
   */
  data: Array<Omit<ActionDetails, 'outputs'>>;
  statuses: ResponseActionStatus[] | undefined;
  total: number;
}

/**
 * File upload metadata information. Stored by endpoint/fleet-server when a file is uploaded to ES in connection with
 * a response action
 */
export interface FileUploadMetadata {
  action_id: string;
  agent_id: string;
  src: string; // The agent name. `endpoint` for security solution files
  upload_id: string;
  upload_start: number;
  contents: Array<{
    accessed: string; // ISO date
    created: string; // ISO date
    directory: string;
    file_extension: string;
    file_name: string;
    gid: number;
    inode: number;
    mode: string;
    mountpoint: string;
    mtime: string;
    path: string;
    sha256: string;
    size: number;
    target_path: string;
    type: string;
    uid: number;
  }>;
  file: Pick<
    Required<BaseFileMetadata>,
    'name' | 'size' | 'Status' | 'ChunkSize' | 'mime_type' | 'extension'
  > &
    Omit<BaseFileMetadata, 'name' | 'size' | 'Status' | 'ChunkSize' | 'mime_type' | 'extension'> & {
      compression: FileCompression;
      attributes: string[];
    };
  host: {
    hostname: string;
  };
  transithash: {
    sha256: string;
  };
}

export type UploadedFileInfo = Pick<
  FileJSON,
  'name' | 'id' | 'mimeType' | 'size' | 'status' | 'created'
> & {
  actionId: string;
  agentId: string;
};

export interface ActionFileInfoApiResponse {
  data: UploadedFileInfo;
}
