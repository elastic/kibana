/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from 'src/core/public';
import { AGENT_TYPE_EPHEMERAL, AGENT_TYPE_PERMANENT, AGENT_TYPE_TEMPORARY } from '../../constants';

export type AgentType =
  | typeof AGENT_TYPE_EPHEMERAL
  | typeof AGENT_TYPE_PERMANENT
  | typeof AGENT_TYPE_TEMPORARY;

export type AgentStatus = 'offline' | 'error' | 'online' | 'inactive' | 'warning';

export interface NewAgentAction {
  type: 'CONFIG_CHANGE' | 'DATA_DUMP' | 'RESUME' | 'PAUSE';
  data?: any;
  sent_at?: string;
}

export interface AgentAction extends NewAgentAction {
  id: string;
  agent_id: string;
  created_at: string;
}

export interface AgentActionSOAttributes extends SavedObjectAttributes {
  type: 'CONFIG_CHANGE' | 'DATA_DUMP' | 'RESUME' | 'PAUSE';
  sent_at?: string;
  created_at: string;
  agent_id: string;
  data?: string;
}

export interface AgentEvent {
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
  agent_id: string;
  action_id?: string;
  config_id?: string;
  stream_id?: string;
}

export interface AgentEventSOAttributes extends AgentEvent, SavedObjectAttributes {}

type MetadataValue = string | AgentMetadata;

export interface AgentMetadata {
  [x: string]: MetadataValue;
}
interface AgentBase {
  type: AgentType;
  active: boolean;
  enrolled_at: string;
  shared_id?: string;
  access_api_key_id?: string;
  default_api_key?: string;
  default_api_key_id?: string;
  config_id?: string;
  config_revision?: number | null;
  config_newest_revision?: number;
  last_checkin?: string;
  user_provided_metadata: AgentMetadata;
  local_metadata: AgentMetadata;
}

export interface Agent extends AgentBase {
  id: string;
  current_error_events: AgentEvent[];
  access_api_key?: string;
  status?: string;
}

export interface AgentSOAttributes extends AgentBase, SavedObjectAttributes {
  current_error_events?: string;
}
