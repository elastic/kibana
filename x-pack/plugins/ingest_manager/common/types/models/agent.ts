/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGENT_TYPE_EPHEMERAL, AGENT_TYPE_PERMANENT, AGENT_TYPE_TEMPORARY } from '../../constants';
import { FullAgentConfig } from './agent_config';

export type AgentType =
  | typeof AGENT_TYPE_EPHEMERAL
  | typeof AGENT_TYPE_PERMANENT
  | typeof AGENT_TYPE_TEMPORARY;

export type AgentStatus =
  | 'offline'
  | 'error'
  | 'online'
  | 'inactive'
  | 'warning'
  | 'enrolling'
  | 'unenrolling'
  | 'degraded';

export type AgentActionType = 'CONFIG_CHANGE' | 'UNENROLL' | 'UPGRADE';

export type NewAgentAction =
  | {
      type: 'CONFIG_CHANGE';
      data: FullAgentConfig;
      sent_at?: string;
    }
  | {
      type: 'UNENROLL';
      sent_at?: string;
    }
  | {
      type: 'UPGRADE';
      data: {
        version: string;
        source_uri: string;
      };
      sent_at?: string;
    };

export type AgentAction = NewAgentAction & {
  id: string;
  data?: any;
  agent_id: string;
  created_at: string;
};

export interface AgentActionSOAttributes {
  type: AgentActionType;
  sent_at?: string;
  timestamp?: string;
  created_at: string;
  agent_id: string;
  data?: string;
}

export interface NewAgentEvent {
  type: 'STATE' | 'ERROR' | 'ACTION_RESULT' | 'ACTION';
  subtype: // State
  | 'RUNNING'
    | 'STARTING'
    | 'IN_PROGRESS'
    | 'CONFIG'
    | 'FAILED'
    | 'STOPPING'
    | 'STOPPED'
    | 'DEGRADED'
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

export interface AgentEvent extends NewAgentEvent {
  id: string;
}

export type AgentEventSOAttributes = NewAgentEvent;

type MetadataValue = string | AgentMetadata;

export interface AgentMetadata {
  [x: string]: MetadataValue;
}
interface AgentBase {
  type: AgentType;
  active: boolean;
  enrolled_at: string;
  unenrolled_at?: string;
  unenrollment_started_at?: string;
  shared_id?: string;
  access_api_key_id?: string;
  default_api_key?: string;
  default_api_key_id?: string;
  config_id?: string;
  config_revision?: number | null;
  last_checkin?: string;
  last_checkin_status?: 'error' | 'online' | 'degraded';
  user_provided_metadata: AgentMetadata;
  local_metadata: AgentMetadata;
}

export interface Agent extends AgentBase {
  id: string;
  current_error_events: AgentEvent[];
  access_api_key?: string;
  status?: string;
  packages: string[];
}

export interface AgentSOAttributes extends AgentBase {
  current_error_events?: string;
  packages?: string[];
}
