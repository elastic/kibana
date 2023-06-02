/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { FleetActionsClientError } from '../../../common/errors';

import type { FleetActionsClientInterface, FleetAction } from './types';
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

  private _verifyPackageName(action: Partial<FleetAction>) {
    if (action.input_type !== this.packageName) {
      throw new FleetActionsClientError(
        `Action package name mismatch. Expected "${this.packageName}" got "${action.input_type}"`
      );
    }

    return action;
  }

  async createAction(action: Partial<FleetAction>): Promise<ReturnType<typeof createAction>> {
    try {
      const verifiedAction = this._verifyPackageName(action);

      return createAction(this.esClient, verifiedAction);
    } catch (error) {
      throw error;
    }
  }

  async bulkCreateActions(
    actions: Array<Partial<FleetAction>>
  ): Promise<ReturnType<typeof bulkCreateActions>> {
    try {
      actions.map((action) => this._verifyPackageName(action));

      return bulkCreateActions(this.esClient, actions);
    } catch (error) {
      throw error;
    }
  }

  async getActionsByIds(ids: string[]): Promise<ReturnType<typeof getActionsByIds>> {
    try {
      const actions = await getActionsByIds(this.esClient, ids);
      actions.every((action) => this._verifyPackageName(action));

      return actions;
    } catch (error) {
      throw error;
    }
  }

  async getActionsWithKuery(kuery: string): Promise<ReturnType<typeof getActionsWithKuery>> {
    try {
      const actions = await getActionsWithKuery(this.esClient, kuery);
      actions.actions.every((action) => this._verifyPackageName(action));

      return actions;
    } catch (error) {
      throw error;
    }
  }

  async getActionResultsByIds(ids: string[]): Promise<ReturnType<typeof getActionResultsByIds>> {
    try {
      const actions = await this.getActionsByIds(ids);
      actions.map((action) => action.action_id);
      return getActionResultsByIds(
        this.esClient,
        actions.map((action) => action.action_id)
      );
    } catch (error) {
      throw error;
    }
  }

  async getActionResultsWithKuery(
    kuery: string
  ): Promise<ReturnType<typeof getActionResultsWithKuery>> {
    try {
      const results = await getActionResultsWithKuery(this.esClient, kuery);
      const resultActionIds = results.actionsResults.map((result) => result.action_id);
      await this.getActionsByIds(resultActionIds);

      return results;
    } catch (error) {
      throw error;
    }
  }
}
