/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskRegisterDefinition,
} from '@kbn/task-manager-plugin/server';
import { Logger } from '@kbn/core/server';

import { ThreatIntelligencePluginCoreSetupDependencies } from './plugin_contract';

function millisecondsFromNow(ms: number) {
  if (!ms) {
    return;
  }

  const dt = new Date();
  dt.setTime(dt.getTime() + ms);
  return dt;
}

const THREAT_INTELLIGENCE_MATCHER_TASK_NAME = 'ti:matcher';

export const registerBackgroundTask = ({
  core,
  taskManager,
  logger,
}: {
  core: ThreatIntelligencePluginCoreSetupDependencies;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}) => {
  const defaultSampleTaskConfig: TaskRegisterDefinition = {
    timeout: '1m',
    createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
      async run() {
        const { params, state, id } = taskInstance;
        const prevState = state || { count: 0 };

        logger.info(
          `running background task ${THREAT_INTELLIGENCE_MATCHER_TASK_NAME} ${id} ${state.count}`
        );

        const count = (prevState.count || 0) + 1;

        const runParams = {
          ...params,
        };

        const [{ elasticsearch }] = await core.getStartServices();

        await elasticsearch.client.asInternalUser.count({ index: 'logs-ti' });

        await elasticsearch.client.asInternalUser.index({
          index: '.kibana_ti_matcher_task_results',
          body: {
            type: 'task',
            taskId: taskInstance.id,
            params: JSON.stringify(runParams),
            state: JSON.stringify(state),
            ranAt: new Date(),
          },
          refresh: true,
        });

        return {
          state: { count },
          runAt: millisecondsFromNow(runParams.nextRunMilliseconds),
        };
      },
    }),
  };

  taskManager.registerTaskDefinitions({
    [THREAT_INTELLIGENCE_MATCHER_TASK_NAME]: {
      ...defaultSampleTaskConfig,
    },
  });
};

export const scheduleBackgroundTask = (taskManager: TaskManagerStartContract) => {
  taskManager.ensureScheduled({
    id: THREAT_INTELLIGENCE_MATCHER_TASK_NAME,
    taskType: THREAT_INTELLIGENCE_MATCHER_TASK_NAME,
    schedule: {
      interval: '5m',
    },
    scope: ['ti'],
    params: {},
    state: {},
  });
};
