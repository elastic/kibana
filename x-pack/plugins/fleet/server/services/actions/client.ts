/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { FleetActionsClientError } from '../../../common/errors';

import type {
  FleetActionsClientInterface,
  FleetActionRequest,
  FleetActionResult,
  BulkCreateResponse,
} from './types';
import {
  createAction,
  bulkCreateActions,
  getActionsByIds,
  getActionsWithKuery,
  getActionResultsByIds,
  getActionResultsWithKuery,
} from './actions';

export class FleetActionsClient implements FleetActionsClientInterface {
  constructor(private esClient: ElasticsearchClient, private packageName: string) {
    if (!packageName) {
      throw new FleetActionsClientError('packageName is required');
    }
  }

  private _verifyAction(action: FleetActionRequest) {
    if (action.input_type !== this.packageName) {
      throw new FleetActionsClientError(
        `Action package name mismatch. Expected "${this.packageName}" got "${action.input_type}. Action: ${action.action_id}."`
      );
    }

    return action;
  }

  private _verifyResult(result: FleetActionResult) {
    if (result.action_input_type !== this.packageName) {
      throw new FleetActionsClientError(
        `Action result package name mismatch. Expected "${this.packageName}" got "${result.action_input_type}". Result: ${result.action_id}`
      );
    }

    return result;
  }

  async create(action: FleetActionRequest): Promise<FleetActionRequest> {
    const verifiedAction = this._verifyAction(action);
    return createAction(this.esClient, verifiedAction);
  }

  async bulkCreate(actions: FleetActionRequest[]): Promise<BulkCreateResponse> {
    actions.map((action) => this._verifyAction(action));

    return bulkCreateActions(this.esClient, actions);
  }

  async getActionsByIds(ids: string[]): Promise<{
    items: FleetActionRequest[];
    total: number;
  }> {
    const actions = await getActionsByIds(this.esClient, ids);
    actions.items.every((action) => this._verifyAction(action));

    return actions;
  }

  async getActionsWithKuery(kuery: string): Promise<{
    items: FleetActionRequest[];
    total: number;
  }> {
    const actions = await getActionsWithKuery(this.esClient, kuery);
    actions.items.every((action) => this._verifyAction(action));

    return actions;
  }

  async getResultsByIds(ids: string[]): Promise<{
    items: FleetActionResult[];
    total: number;
  }> {
    const results = await getActionResultsByIds(this.esClient, ids);
    results.items.every((result) => this._verifyResult(result));

    return results;
  }

  async getResultsWithKuery(kuery: string): Promise<{
    items: FleetActionResult[];
    total: number;
  }> {
    const results = await getActionResultsWithKuery(this.esClient, kuery);
    results.items.every((result) => this._verifyResult(result));

    return results;
  }
}
