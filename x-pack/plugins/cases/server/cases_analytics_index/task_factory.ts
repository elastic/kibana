/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { CaseAnalyticsIndexSyncTaskRunner } from './task_runner';

interface ConstructorArgs {
  getSavedOjectClient: () => Promise<ISavedObjectsRepository>;
  getESClient: () => Promise<ElasticsearchClient>;
}

export class CaseAnalyticsIndexSyncTaskFactory {
  private readonly getSavedOjectClient: ConstructorArgs['getSavedOjectClient'];
  private readonly getESClient: ConstructorArgs['getESClient'];

  constructor({ getSavedOjectClient, getESClient }: ConstructorArgs) {
    this.getSavedOjectClient = getSavedOjectClient;
    this.getESClient = getESClient;
  }

  public create(context: RunContext) {
    return new CaseAnalyticsIndexSyncTaskRunner({
      taskInstance: context.taskInstance,
      getSavedOjectClient: this.getSavedOjectClient,
      getESClient: this.getESClient,
    });
  }
}
