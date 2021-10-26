/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { ActionStatusRequestSchema, HostIsolationRequestSchema } from '../schema/actions';

export type ISOLATION_ACTIONS = 'isolate' | 'unisolate';

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

export interface LogsEndpointActionResponse {
  '@timestamp': string;
  agent: {
    id: string | string[];
  };
  EndpointActions: EndpointActionFields & ActionResponseFields;
  error?: EcsError;
}

export interface EndpointActionData {
  command: ISOLATION_ACTIONS;
  comment?: string;
}

export interface FleetActionResponseData {
  endpoint?: {
    ack?: boolean;
  };
}

export interface EndpointAction {
  action_id: string;
  '@timestamp': string;
  expiration: string;
  type: 'INPUT_ACTION';
  input_type: 'endpoint';
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

export type HostIsolationRequestBody = TypeOf<typeof HostIsolationRequestSchema.body>;

export interface HostIsolationResponse {
  action: string;
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
