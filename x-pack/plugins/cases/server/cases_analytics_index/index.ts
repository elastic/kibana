/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CoreSetup, ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../common/constants';
import { TASK_NAME } from './constants';
import { CaseAnalyticsIndexSyncTaskFactory } from './task_factory';
import type { CasesServerStartDependencies } from '../types';

export const registerCaseAnalyticsIndexSyncTask = ({
  core,
  taskManager,
}: {
  core: CoreSetup<CasesServerStartDependencies>;
  taskManager: TaskManagerSetupContract;
}) => {
  const getSavedOjectClient = async (): Promise<ISavedObjectsRepository> => {
    const [{ savedObjects }] = await core.getStartServices();
    return savedObjects.createInternalRepository([CASE_SAVED_OBJECT]);
  };

  const getESClient = async (): Promise<ElasticsearchClient> => {
    const [{ elasticsearch }] = await core.getStartServices();
    return elasticsearch.client.asInternalUser;
  };

  taskManager.registerTaskDefinitions({
    [TASK_NAME]: {
      title: 'Cases analytics index task',
      createTaskRunner: (context: RunContext) => {
        return new CaseAnalyticsIndexSyncTaskFactory({ getSavedOjectClient, getESClient }).create(
          context
        );
      },
    },
  });
};

export const scheduleCaseAnalyticsIndexSyncTask = (
  taskManager: TaskManagerStartContract
): Promise<ConcreteTaskInstance> => {
  const runAt = new Date();
  // run the task after 5 minutes
  runAt.setSeconds(runAt.getSeconds() + 60 * 5);

  return taskManager.schedule({
    id: 'cases-analytics-index-task',
    taskType: TASK_NAME,
    params: {},
    state: {},
    schedule: { interval: '5m' },
    runAt,
  });
};
