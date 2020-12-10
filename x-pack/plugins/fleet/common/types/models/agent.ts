/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FullAgentPolicy } from './agent_policy';
import { AGENT_TYPE_EPHEMERAL, AGENT_TYPE_PERMANENT, AGENT_TYPE_TEMPORARY } from '../../constants';

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
  | 'updating'
  | 'degraded';

export type SimplifiedAgentStatus = 'healthy' | 'unhealthy' | 'updating' | 'offline' | 'inactive';

export type AgentActionType =
  | 'POLICY_CHANGE'
  | 'UNENROLL'
  | 'UPGRADE'
  | 'SETTINGS'
  // INTERNAL* actions are mean to interupt long polling calls these actions will not be distributed to the agent
  | 'INTERNAL_POLICY_REASSIGN';

export interface NewAgentAction {
  type: AgentActionType;
  data?: any;
  sent_at?: string;
}

export interface AgentAction extends NewAgentAction {
  type: AgentActionType;
  data?: any;
  sent_at?: string;
  id: string;
  agent_id: string;
  created_at: string;
  ack_data?: any;
}

export interface AgentPolicyAction extends NewAgentAction {
  id: string;
  type: AgentActionType;
  data: {
    policy: FullAgentPolicy;
  };
  policy_id: string;
  policy_revision: number;
  created_at: string;
  ack_data?: any;
}

// Make policy change action renaming BWC with agent version <= 7.9
// eslint-disable-next-line @typescript-eslint/naming-convention
export type AgentPolicyActionV7_9 = Omit<AgentPolicyAction, 'type' | 'data'> & {
  type: 'CONFIG_CHANGE';
  data: {
    config: FullAgentPolicy;
  };
};

interface CommonAgentActionSOAttributes {
  type: AgentActionType;
  sent_at?: string;
  timestamp?: string;
  created_at: string;
  data?: string;
  ack_data?: string;
}

export type AgentActionSOAttributes = CommonAgentActionSOAttributes & {
  agent_id: string;
};
export type AgentPolicyActionSOAttributes = CommonAgentActionSOAttributes & {
  policy_id: string;
  policy_revision: number;
};
export type BaseAgentActionSOAttributes = AgentActionSOAttributes | AgentPolicyActionSOAttributes;

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
    | 'UPDATING'
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
  policy_id?: string;
  stream_id?: string;
}

export interface AgentEvent extends NewAgentEvent {
  id: string;
}

export type AgentEventSOAttributes = NewAgentEvent;

export interface AgentMetadata {
  [x: string]: any;
}
interface AgentBase {
  type: AgentType;
  active: boolean;
  enrolled_at: string;
  unenrolled_at?: string;
  unenrollment_started_at?: string;
  upgraded_at?: string;
  upgrade_started_at?: string;
  shared_id?: string;
  access_api_key_id?: string;
  default_api_key?: string;
  default_api_key_id?: string;
  policy_id?: string;
  policy_revision?: number | null;
  last_checkin?: string;
  last_checkin_status?: 'error' | 'online' | 'degraded' | 'updating';
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
