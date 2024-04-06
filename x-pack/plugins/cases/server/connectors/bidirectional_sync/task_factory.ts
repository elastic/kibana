/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { CasesClient } from '../../client';
import { BidirectionalSyncTaskRunner } from './task_runner';

interface ConstructorArgs {
  getActionsClient: (request: KibanaRequest) => Promise<ActionsClient>;
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
}

export class BidirectionalSyncTaskFactory {
  private readonly getActionsClient: ConstructorArgs['getActionsClient'];
  private readonly getCasesClient: ConstructorArgs['getCasesClient'];

  constructor({ getActionsClient, getCasesClient }: ConstructorArgs) {
    this.getActionsClient = getActionsClient;
    this.getCasesClient = getCasesClient;
  }

  public create(context: RunContext) {
    return new BidirectionalSyncTaskRunner({
      taskInstance: context.taskInstance,
      getActionsClient: this.getActionsClient,
      getCasesClient: this.getCasesClient,
    });
  }
}
