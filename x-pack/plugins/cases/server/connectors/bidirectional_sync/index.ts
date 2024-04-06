/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { TASK_NAME } from './constants';
import { BidirectionalSyncTaskFactory } from './task_factory';
import type { CasesServerStartDependencies } from '../../types';
import type { CasesClient } from '../../client';

export const registerBidirectionalSyncTask = ({
  core,
  taskManager,
  getCasesClient,
}: {
  core: CoreSetup<CasesServerStartDependencies>;
  taskManager: TaskManagerSetupContract;
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
}) => {
  const getActionsClient = async (request: KibanaRequest): Promise<ActionsClient> => {
    const [_, { actions }] = await core.getStartServices();

    return actions.getActionsClientWithRequest(request);
  };

  taskManager.registerTaskDefinitions({
    // Should we have one per connector type?
    [TASK_NAME]: {
      title: 'Connectors bidirectional synchronization task for Cases',
      createTaskRunner: (context: RunContext) => {
        return new BidirectionalSyncTaskFactory({ getActionsClient, getCasesClient }).create(
          context
        );
      },
    },
  });
};
