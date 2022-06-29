/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AGENT_TYPE_EPHEMERAL,
  AGENT_TYPE_PERMANENT,
  AGENT_TYPE_TEMPORARY,
} from '../../constants';

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
  | 'POLICY_REASSIGN'
  | 'CANCEL';

export interface NewAgentAction {
  type: AgentActionType;
  data?: any;
  ack_data?: any;
  sent_at?: string;
  agents: string[];
  created_at?: string;
  id?: string;
  expiration?: string;
  start_time?: string;
  minimum_execution_duration?: number;
}

export interface AgentAction extends NewAgentAction {
  type: AgentActionType;
  data?: any;
  sent_at?: string;
  id: string;
  created_at: string;
  ack_data?: any;
}

export interface AgentMetadata {
  [x: string]: any;
}
interface AgentBase {
  type: AgentType;
  active: boolean;
  enrolled_at: string;
  unenrolled_at?: string;
  unenrollment_started_at?: string;
  upgraded_at?: string | null;
  upgrade_started_at?: string | null;
  access_api_key_id?: string;
  default_api_key?: string;
  default_api_key_id?: string;
  policy_id?: string;
  policy_revision?: number | null;
  last_checkin?: string;
  last_checkin_status?: 'error' | 'online' | 'degraded' | 'updating';
  user_provided_metadata: AgentMetadata;
  local_metadata: AgentMetadata;
  tags?: string[];
}

export interface Agent extends AgentBase {
  id: string;
  access_api_key?: string;
  status?: AgentStatus;
  packages: string[];
  sort?: Array<number | string | null>;
}

export interface AgentSOAttributes extends AgentBase {
  packages?: string[];
}

export interface CurrentUpgrade {
  actionId: string;
  complete: boolean;
  nbAgents: number;
  nbAgentsAck: number;
  version: string;
  startTime?: string;
}

// Generated from FleetServer schema.json

/**
 * An Elastic Agent that has enrolled into Fleet
 */
export interface FleetServerAgent {
  /**
   * The version of the document in the index
   */
  _version?: number;
  /**
   * Shared ID
   */
  shared_id?: string;
  /**
   * Type
   */
  type: AgentType;
  /**
   * Active flag
   */
  active: boolean;
  /**
   * Date/time the Elastic Agent enrolled
   */
  enrolled_at: string;
  /**
   * Date/time the Elastic Agent unenrolled
   */
  unenrolled_at?: string;
  /**
   * Date/time the Elastic Agent unenrolled started
   */
  unenrollment_started_at?: string;
  /**
   * Date/time the Elastic Agent was last upgraded
   */
  upgraded_at?: string | null;
  /**
   * Date/time the Elastic Agent started the current upgrade
   */
  upgrade_started_at?: string | null;
  /**
   * ID of the API key the Elastic Agent must used to contact Fleet Server
   */
  access_api_key_id?: string;
  agent?: FleetServerAgentMetadata;
  /**
   * User provided metadata information for the Elastic Agent
   */
  user_provided_metadata: AgentMetadata;
  /**
   * Local metadata information for the Elastic Agent
   */
  local_metadata: AgentMetadata;
  /**
   * The policy ID for the Elastic Agent
   */
  policy_id?: string;
  /**
   * The current policy revision_idx for the Elastic Agent
   */
  policy_revision_idx?: number | null;
  /**
   * The current policy coordinator for the Elastic Agent
   */
  policy_coordinator_idx?: number;
  /**
   * Date/time the Elastic Agent was last updated
   */
  last_updated?: string;
  /**
   * Date/time the Elastic Agent checked in last time
   */
  last_checkin?: string;
  /**
   * Lst checkin status
   */
  last_checkin_status?: 'error' | 'online' | 'degraded' | 'updating';
  /**
   * ID of the API key the Elastic Agent uses to authenticate with elasticsearch
   */
  default_api_key_id?: string;
  /**
   * API key the Elastic Agent uses to authenticate with elasticsearch
   */
  default_api_key?: string;
  /**
   * Date/time the Elastic Agent was last updated
   */
  updated_at?: string;
  /**
   * Packages array
   */
  packages?: string[];
  /**
   * The last acknowledged action sequence number for the Elastic Agent
   */
  action_seq_no?: number;
  /**
   * A list of tags used for organizing/filtering agents
   */
  tags?: string[];
}
/**
 * An Elastic Agent metadata
 */
export interface FleetServerAgentMetadata {
  /**
   * The unique identifier for the Elastic Agent
   */
  id: string;
  /**
   * The version of the Elastic Agent
   */
  version: string;
  [k: string]: any;
}

/**
 * An Elastic Agent action
 */
export interface FleetServerAgentAction {
  /**
   * The unique identifier for action document
   */
  _id?: string;
  /**
   * The action sequence number
   */
  _seq_no?: number;
  /**
   * The unique identifier for the Elastic Agent action. There could be multiple documents with the same action_id if the action is split into two separate documents.
   */
  action_id?: string;
  /**
   * Date/time the action was created
   */
  '@timestamp'?: string;
  /**
   * The action expiration date/time
   */
  expiration?: string;
  /**
   * The action type. APP_ACTION is the value for the actions that suppose to be routed to the endpoints/beats.
   */
  type?: string;
  /**
   * The input identifier the actions should be routed to.
   */
  input_id?: string;
  /**
   * The Agent IDs the action is intended for. No support for json.RawMessage with the current generator. Could be useful to lazy parse the agent ids
   */
  agents?: string[];

  /**
   * Date when the agent should execute that agent. This field could be altered by Fleet server for progressive rollout of the action.
   */
  start_time?: string;

  /**
   * Minimun execution duration in seconds, used for progressive rollout of the action.
   */
  minimum_execution_duration?: number;

  /**
   * The opaque payload.
   */
  data?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
