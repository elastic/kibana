/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger, SavedObject } from '@kbn/core/server';
import type { WorkflowDefinition } from '@kbn/wc-framework-types-server';
import { workflowSoTypeName, type WorkflowAttributes } from '../../saved_objects/workflow';
import { createBuilder } from '../utils';
import type { UserInfo } from './types';
import { savedObjectToModel } from './converters';

interface ConversationClientOptions {
  logger: Logger;
  client: SavedObjectsClientContract;
  user: UserInfo;
}

export interface WorkflowListOptions {
  category?: string;
}

export interface WorkflowGetOptions {
  workflowId: string;
}

/**
 * Client to interact with the workflow saved objects.
 */
export interface WorkflowClient {
  list(options?: WorkflowListOptions): Promise<WorkflowDefinition[]>;
  get(options: WorkflowGetOptions): Promise<WorkflowDefinition>;
}

export class WorkflowClientImpl implements WorkflowClient {
  private readonly client: SavedObjectsClientContract;
  private readonly user: UserInfo;
  // @ts-expect-error will be used at some point
  private readonly logger: Logger;

  constructor({ client, user, logger }: ConversationClientOptions) {
    this.client = client;
    this.user = user;
    this.logger = logger;
  }

  async list(options: WorkflowListOptions = {}): Promise<WorkflowDefinition[]> {
    const builder = createBuilder(workflowSoTypeName);
    const filter = builder
      .and(
        builder.equals('user_id', this.user.id),
        ...(options.category ? [builder.equals('categories', options.category)] : [])
      )
      .toKQL();
    const { saved_objects: results } = await this.client.find<WorkflowAttributes>({
      type: workflowSoTypeName,
      filter,
      perPage: 1000,
    });

    return results.map(savedObjectToModel);
  }

  async get({ workflowId }: { workflowId: string }): Promise<WorkflowDefinition> {
    const workflowSo = await this._rawGet({ workflowId });
    return savedObjectToModel(workflowSo);
  }

  private async _rawGet({
    workflowId,
  }: {
    workflowId: string;
  }): Promise<SavedObject<WorkflowAttributes>> {
    const builder = createBuilder(workflowSoTypeName);
    const filter = builder
      .and(builder.equals('user_id', this.user.id), builder.equals('workflow_id', workflowId))
      .toKQL();

    const { saved_objects: results } = await this.client.find<WorkflowAttributes>({
      type: workflowSoTypeName,
      filter,
    });
    if (results.length > 0) {
      return results[0];
    }
    throw new Error(`Workflow ${workflowId} not found`);
  }
}
