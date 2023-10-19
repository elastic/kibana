/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BulkCreateResponse {
  status: 'success' | 'failed' | 'mixed';
  items: Array<{
    status: 'success' | 'error';
    id: string; // same as action_id
  }>;
}

export interface FleetActionsClientInterface {
  /**
   *
   * @param action
   * @returns {Promise<FleetActionRequest>}
   * @throws {FleetActionsError}
   * creates a new action document
   */
  create(action: FleetActionRequest): Promise<FleetActionRequest>;

  /**
   *
   * @param actions
   * @returns {Promise<BulkCreateResponse>}
   * @throws {FleetActionsError}
   * creates multiple action documents
   * return successfully created actions
   * logs failed actions documents
   */
  bulkCreate(actions: FleetActionRequest[]): Promise<BulkCreateResponse>;

  /**
   *
   * @param actionIds
   * @returns {Promise<items: FleetActionRequest[], total: number>}
   * @throws {FleetActionsError}
   * returns actions by action ids
   */
  getActionsByIds(actionIds: string[]): Promise<{
    items: FleetActionRequest[];
    total: number;
  }>;

  /**
   *
   * @param kuery
   * @returns {Promise<items: FleetActionRequest[], total: number>}
   * @throws {FleetActionsError}
   * returns actions by kuery
   */
  getActionsWithKuery(kuery: string): Promise<{
    items: FleetActionRequest[];
    total: number;
  }>;

  /**
   *
   * @param actionIds
   * @returns {Promise<items: FleetActionResult[], total: number>}
   * @throws {FleetActionsError}
   * returns action results by action ids
   */
  getResultsByIds(actionIds: string[]): Promise<{
    items: FleetActionResult[];
    total: number;
  }>;

  /**
   *
   * @param kuery
   * @returns {Promise<items: FleetActionResult[], total: number>}
   * @throws {FleetActionsError}
   * returns action results by action ids
   */
  getResultsWithKuery(kuery: string): Promise<{
    items: FleetActionResult[];
    total: number;
  }>;
}

interface CommonFleetActionResultDocFields {
  '@timestamp': string;
  action_id: string;
  //
  data?: {
    [k: string]: unknown;
  };
}

export interface FleetActionRequest extends CommonFleetActionResultDocFields {
  agents: string[];
  expiration: string;
  input_type: string;
  minimum_execution_duration?: number;
  rollout_duration_seconds?: number;
  // only endpoint uses this for now
  signed?: {
    data: string;
    signature: string;
  };
  start_time?: string;
  timeout?: number;
  type: string;
  user_id: string | undefined;

  // allow other fields that are not mapped
  [k: string]: unknown;
}

export interface FleetActionResult extends CommonFleetActionResultDocFields {
  '@timestamp': string;
  action_data: object;
  action_id: string;
  action_input_type: string;
  action_response?: Record<string, unknown>;
  agent_id: string;
  completed_at: string;
  error: string;
  started_at: string;
}
