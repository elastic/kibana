/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  createAction,
  bulkCreateActions,
  getActionsByIds,
  getActionResultsWithKuery,
  getActionResultsByIds,
  getActionsWithKuery,
} from './actions';

export interface FleetActionsClientInterface {
  /**
   *
   * @param action
   * @returns {id: string; created_at: string}
   * @throws {FleetActionsError}
   * creates a new action document
   */
  createAction(action: FleetAction): Promise<ReturnType<typeof createAction>>;

  /**
   *
   * @param actions
   * @returns {id: string; created_at: string}[]
   * @throws {FleetActionsError}
   * creates multiple action documents
   * return successfully created actions
   * logs failed actions documents
   */
  bulkCreateActions(actions: FleetAction[]): Promise<ReturnType<typeof bulkCreateActions>>;

  /**
   *
   * @param actionIds
   * @returns {FleetAction[]}
   * @throws {FleetActionsError}
   * returns actions by action ids
   */
  getActionsByIds(actionIds: string[]): Promise<ReturnType<typeof getActionsByIds>>;

  /**
   *
   * @param kuery
   * @returns {FleetAction[]}
   * @throws {FleetActionsError}
   * returns actions by kuery
   */
  getActionsWithKuery(kuery: string): Promise<ReturnType<typeof getActionsWithKuery>>;

  /**
   *
   * @param actionIds
   * @returns {FleetActionResponse[]}
   * @throws {FleetActionsError}
   * returns action results by action ids
   */
  getActionResultsByIds(actionIds: string[]): Promise<ReturnType<typeof getActionResultsByIds>>;

  /**
   *
   * @param kuery
   * @returns {FleetActionResponse[]}
   */
  getActionResultsWithKuery(kuery: string): Promise<ReturnType<typeof getActionResultsWithKuery>>;
}

interface CommonFleetActionResponseDocFields {
  '@timestamp': string;
  action_id: string;
  data: object;
}

export interface FleetAction extends CommonFleetActionResponseDocFields {
  agents: string[];
  expiration: string;
  input_type: string;
  minimum_execution_duration: number;
  rollout_duration_seconds: number;
  signed: {
    data: string;
    signature: string;
  };
  start_time: string;
  timeout: number;
  type: string;
  user_id: string;
}

export interface FleetActionResponse extends CommonFleetActionResponseDocFields {
  '@timestamp': string;
  action_data: object;
  action_id: string;
  action_input_type: string;
  action_response: {
    endpoint: {
      ack: boolean;
    };
  };
  agent_id: string;
  completed_at: string;
  error: string;
  started_at: string;
}
