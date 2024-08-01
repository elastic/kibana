/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from '@kbn/core/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { SO_SEARCH_LIMIT, AGENTS_PREFIX } from '../constants';
import { getAgentsByKuery } from '../services/agents';
import { unenrollBatch } from '../services/agents/unenroll_action_runner';

export const TYPE = 'fleet:unenroll-inactive-agents-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Deleted Files Periodic Tasks';
const SCOPE = ['fleet'];
const INTERVAL = '1d';

interface UnenrollInactiveAgentsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}
interface UnenrollInactiveAgentsParams {
  timeout: string;
  policyIds: string[];
}

interface UnenrollInactiveAgentsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class UnenrollInactiveAgentsTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController = new AbortController();

  constructor(
    setupContract: UnenrollInactiveAgentsTaskSetupContract,
    params: UnenrollInactiveAgentsParams
  ) {
    const { core, taskManager, logFactory } = setupContract;
    const { timeout } = params;
    this.logger = logFactory.get(this.taskId);

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, params);
            },
            cancel: async () => {
              this.abortController.abort('task timed out');
            },
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: UnenrollInactiveAgentsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(`Started with interval of [${INTERVAL}]`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task UnenrollInactiveAgentsTask, received error: ${e.message}`,
        e
      );
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    params: UnenrollInactiveAgentsParams
  ) => {
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }
    const { policyIds, timeout } = params;
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info(`[runTask()] started`);

    const endRun = (msg: string = '') => {
      this.logger.info(`[runTask()] ended${msg ? ': ' + msg : ''}`);
    };

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      this.logger.debug(
        `Running UnenrollInactiveAgentsTask. Unenrolling inactive agents with policy ids ${policyIds
          .map((id) => `"${id}"`)
          .join(', ')} after timeout of ${timeout}m is reached.`
      );
      const kuery = `(${AGENTS_PREFIX}.policy_id:${policyIds
        .map((id) => `"${id}"`)
        .join(' or ')}) and ${AGENTS_PREFIX}.status: inactive`;

      const res = await getAgentsByKuery(esClient, soClient, {
        kuery,
        showInactive: true,
        page: 1,
        perPage: SO_SEARCH_LIMIT,
      });
      this.logger.debug(`Attempting unenrollment of ${res.total} agents.`);
      const actionId = await unenrollBatch(soClient, esClient, res.agents, {
        revoke: true,
        force: true,
      });

      this.logger.debug(`Executed unenrollment with actionId: ${actionId}`);

      endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`Request aborted due to timeout: ${err}`);
        endRun();
        return;
      }
      this.logger.error(err);
      endRun('error');
    }
  };
}
