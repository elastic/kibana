/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CancellableTask, ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';

interface ConstructorArgs {
  taskInstance: ConcreteTaskInstance;
  getSavedOjectClient: () => Promise<ISavedObjectsRepository>;
  getESClient: () => Promise<ElasticsearchClient>;
}

export class CaseAnalyticsIndexSyncTaskRunner implements CancellableTask {
  private readonly taskInstance: ConcreteTaskInstance;
  private readonly getSavedOjectClient: ConstructorArgs['getSavedOjectClient'];
  private readonly getESClient: ConstructorArgs['getESClient'];

  constructor({ taskInstance, getSavedOjectClient, getESClient }: ConstructorArgs) {
    this.taskInstance = taskInstance;
    this.getSavedOjectClient = getSavedOjectClient;
    this.getESClient = getESClient;
  }

  private async getAllCases() {}

  private async updateIndex(cases: unknown[]) {}

  public async run() {
    const { params, state } = this.taskInstance;

    console.log(`running task`, params, state);
  }

  public async cancel() {}
}
