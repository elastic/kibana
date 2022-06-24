/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  ActionStatusRequestSchema,
  NoParametersRequestSchema,
  ResponseActionBodySchema,
} from '../schema/actions';

export type ISOLATION_ACTIONS = 'isolate' | 'unisolate';

export const RESPONSE_ACTION_COMMANDS = [
  'isolate',
  'unisolate',
  'kill-process',
  'suspend-process',
  'running-processes',
] as const;

export type ResponseActions = typeof RESPONSE_ACTION_COMMANDS[number];

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

interface EndpointActionFields {
  action_id: string;
  data: EndpointActionData;
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
export interface LogsEndpointActionResponse {
  '@timestamp': string;
  agent: {
    id: string | string[];
  };
  EndpointActions: EndpointActionFields & ActionResponseFields;
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

export type EndpointActionDataParameterTypes =
  | undefined
  | ResponseActionParametersWithPidOrEntityId;

export interface EndpointActionData<T extends EndpointActionDataParameterTypes = undefined> {
  command: ResponseActions;
  comment?: string;
  parameters?: T;
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

export interface HostIsolationResponse {
  action: string;
}

export interface ResponseActionApiResponse {
  action?: string; // only if command is isolate or release
  data: ActionDetails;
}

export interface EndpointPendingActions {
  agent_id: string;
  pending_actions: {
    /** Number of actions pending for each type. The `key` could be one of the `ISOLATION_ACTIONS` values. */
    [key: string]: number;
  };
}

export interface PendingActionsResponse {
  data: EndpointPendingActions[];
}

export type PendingActionsRequestQuery = TypeOf<typeof ActionStatusRequestSchema.query>;

export interface ActionDetails {
  /** The action id */
  id: string;
  /**
   * The Endpoint ID (and fleet agent ID - they are the same) for which the action was created for.
   * This is an Array because the action could have been sent to multiple endpoints.
   */
  agents: string[];
  /**
   * The Endpoint type of action (ex. `isolate`, `release`) that is being requested to be
   * performed on the endpoint
   */
  command: ResponseActions;
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
  /** user that created the action */
  createdBy: string;
  /** comment submitted with action */
  comment?: string;
  /** parameters submitted with action */
  parameters?: EndpointActionDataParameterTypes;
}

export interface ActionDetailsApiResponse {
  data: ActionDetails;
}
export interface ActionListApiResponse {
  page: number | undefined;
  pageSize: number | undefined;
  startDate: string | undefined;
  elasticAgentIds: string[] | undefined;
  endDate: string | undefined;
  userIds: string[] | undefined; // users that requested the actions
  commands: string[] | undefined; // type of actions
  data: ActionDetails[];
  total: number;
}
