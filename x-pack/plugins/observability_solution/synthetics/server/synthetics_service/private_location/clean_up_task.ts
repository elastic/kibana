/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConcreteTaskInstance, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import {
  BROWSER_TEST_NOW_RUN,
  LIGHTWEIGHT_TEST_NOW_RUN,
} from '../synthetics_monitor/synthetics_monitor_client';
import { SyntheticsServerSetup } from '../../types';

const SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE = 'Synthetics:Clean-Up-Package-Policies';
const SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID = 'SyntheticsService:clean-up-package-policies-task-id';
const SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT = '60m';
const DELETE_BROWSER_MINUTES = 15;
const DELETE_LIGHTWEIGHT_MINUTES = 2;

export const registerCleanUpTask = (
  taskManager: TaskManagerSetupContract,
  serverSetup: SyntheticsServerSetup
) => {
  const { logger } = serverSetup;
  const interval = SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT;

  taskManager.registerTaskDefinitions({
    [SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE]: {
      title: 'Synthetics Plugin Clean Up Task',
      description: 'This task which runs periodically to clean up run once monitors.',
      timeout: '1m',
      maxAttempts: 3,

      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          // Perform the work of the task. The return value should fit the TaskResult interface.
          async run() {
            logger.info(
              `Executing synthetics clean up task: ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID}`
            );
            const { state } = taskInstance;
            try {
              const esClient = serverSetup.coreStart?.elasticsearch?.client.asInternalUser;
              if (esClient) {
                const { fleet } = serverSetup.pluginsStart;
                const { savedObjects } = serverSetup.coreStart;
                const soClient = savedObjects.createInternalRepository();

                const { items } = await fleet.packagePolicyService.list(soClient, {
                  kuery: getFilterForTestNowRun(),
                });

                const allItems = items.map((item) => {
                  const minutesAgo = moment().diff(moment(item.created_at), 'minutes');
                  const isBrowser = item.name === BROWSER_TEST_NOW_RUN;
                  if (isBrowser) {
                    return {
                      isBrowser: true,
                      id: item.id,
                      shouldDelete: minutesAgo > DELETE_BROWSER_MINUTES,
                    };
                  } else {
                    return {
                      isBrowser: false,
                      id: item.id,
                      shouldDelete: minutesAgo > DELETE_LIGHTWEIGHT_MINUTES,
                    };
                  }
                });
                const toDelete = allItems.filter((item) => item.shouldDelete);
                if (toDelete.length > 0) {
                  await fleet.packagePolicyService.delete(
                    soClient,
                    esClient,
                    toDelete.map((item) => item.id),
                    {
                      force: true,
                    }
                  );
                }
                const remaining = allItems.filter((item) => !item.shouldDelete);
                if (remaining.length === 0) {
                  return { state, schedule: { interval: '24h' } };
                } else {
                  return { state, schedule: { interval: '20m' } };
                }
              }
            } catch (e) {
              logger.error(e);
            }

            return { state, schedule: { interval } };
          },
        };
      },
    },
  });
};

export const scheduleCleanUpTask = async ({ logger, pluginsStart }: SyntheticsServerSetup) => {
  const interval = SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT;

  try {
    const taskInstance = await pluginsStart.taskManager.ensureScheduled({
      id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
      taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
      schedule: {
        interval,
      },
      params: {},
      state: {},
      scope: ['uptime'],
    });

    logger?.info(
      `Task ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
    );

    await pluginsStart.taskManager.runSoon(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);
  } catch (e) {
    logger?.error(e);
    logger?.error(
      `Error running synthetics clean up task: ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID}, ${e?.message}`
    );
  }
};

const getFilterForTestNowRun = () => {
  const pkg = 'ingest-package-policies';

  let filter = `${pkg}.package.name:synthetics and ${pkg}.is_managed:true`;
  const lightweight = `${pkg}.name: ${LIGHTWEIGHT_TEST_NOW_RUN}`;
  const browser = `${pkg}.name: ${BROWSER_TEST_NOW_RUN}`;
  filter = `${filter} and (${lightweight} or ${browser})`;
  return filter;
};
