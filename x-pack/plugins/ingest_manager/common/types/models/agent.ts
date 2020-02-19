/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const AGENT_TYPE_PERMANENT = 'PERMANENT';
export const AGENT_TYPE_EPHEMERAL = 'EPHEMERAL';
export const AGENT_TYPE_TEMPORARY = 'TEMPORARY';

export const AGENT_POLLING_THRESHOLD_MS = 30000;
export const AGENT_POLLING_INTERVAL = 1000;

export type AgentTypeSchema =
  | typeof AGENT_TYPE_EPHEMERAL
  | typeof AGENT_TYPE_PERMANENT
  | typeof AGENT_TYPE_TEMPORARY;

export type AgentType = AgentTypeSchema;

interface AgentActionBaseSchema {
  type: 'POLICY_CHANGE' | 'DATA_DUMP' | 'RESUME' | 'PAUSE';
  id: string;
  created_at: string;
  data?: string;
  sent_at?: string;
}

type AgentActionSchema = AgentActionBaseSchema;
export type AgentAction = AgentActionSchema;

interface AgentEventBase {
  type: 'STATE' | 'ERROR' | 'ACTION_RESULT' | 'ACTION';
  subtype: // State
  | 'RUNNING'
    | 'STARTING'
    | 'IN_PROGRESS'
    | 'CONFIG'
    | 'FAILED'
    | 'STOPPING'
    | 'STOPPED'
    // Action results
    | 'DATA_DUMP'
    // Actions
    | 'ACKNOWLEDGED'
    | 'UNKNOWN';
  timestamp: string;
  message: string;
  payload?: any;
  data?: string;
  action_id?: string;
  policy_id?: string;
  stream_id?: string;
}

export type AgentEventSchema = AgentEventBase;

type AgentEventSOAttributesSchema = AgentEventBase;

export type AgentEvent = AgentEventSchema;
export type AgentEventSOAttributes = AgentEventSOAttributesSchema;
interface AgentBaseSchema {
  type: AgentTypeSchema;
  active: boolean;
  enrolled_at: string;
  user_provided_metadata: Record<string, string>;
  local_metadata: Record<string, string>;
  shared_id?: string;
  access_api_key_id?: string;
  default_api_key?: string;
  policy_id?: string;
  last_checkin?: string;
  config_updated_at?: string;
  actions: AgentActionSchema[];
  current_error_events: AgentEventSchema[];
}

type AgentSchema = AgentBaseSchema & {
  id: string;
  user_provided_metadata: Record<string, string>;
  local_metadata: Record<string, string>;
  access_api_key?: string;
  status?: string;
};

type AgentSOAttributesSchema = AgentBaseSchema & {
  user_provided_metadata: string;
  local_metadata: string;
  current_error_events?: string;
};

export type Agent = AgentSchema;
export type AgentSOAttributes = AgentSOAttributesSchema;

export type AgentStatus = 'offline' | 'error' | 'online' | 'inactive' | 'warning';
