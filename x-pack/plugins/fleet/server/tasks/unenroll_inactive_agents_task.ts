/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from '@kbn/core/server';
import type {
  CoreSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { SO_SEARCH_LIMIT, AGENTS_PREFIX, AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import { getAgentsByKuery } from '../services/agents';
import { unenrollBatch } from '../services/agents/unenroll_action_runner';
import { agentPolicyService } from '../services';

export const TYPE = 'fleet:unenroll-inactive-agents-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Deleted Files Periodic Tasks';
const SCOPE = ['fleet'];
const INTERVAL = '10m';
const TIMEOUT = '1m';

interface UnenrollInactiveAgentsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface UnenrollInactiveAgentsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class UnenrollInactiveAgentsTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController = new AbortController();

  constructor(setupContract: UnenrollInactiveAgentsTaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController.abort('Task timed out');
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

  private endRun(msg: string = '') {
    this.logger.info(`[runTask()] ended${msg ? ': ' + msg : ''}`);
  }

  private async fetchAgentsWithUnenrollmentTimeout(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
    this.logger.debug(
      `Running UnenrollInactiveAgentsTask. Fetching agent policies with unenroll_timeout > 0`
    );
    // find all agent policies having unenroll_timeout > 0
    const policiesKuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.unenroll_timeout > 0`;
    const agentPolicies = await agentPolicyService.list(soClient, {
      kuery: policiesKuery,
      perPage: SO_SEARCH_LIMIT,
      withPackagePolicies: true,
    });
    const policyIds = agentPolicies?.items.map((policy) => policy.id);
    this.logger.debug(
      `UnenrollInactiveAgentsTask. Found "${policyIds.length}" agent policies with unenroll_timeout > 0`
    );
    if (!policyIds.length) {
      this.endRun('No policies with with unenroll_timeout set');
      return;
    }

    // find agents enrolled on above policies that are also inactive
    const kuery = `(${AGENTS_PREFIX}.policy_id:${policyIds
      .map((id) => `"${id}"`)
      .join(' or ')}) and ${AGENTS_PREFIX}.status: inactive`;
    const res = await getAgentsByKuery(esClient, soClient, {
      kuery,
      showInactive: true,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
    });
    if (!res.agents.length) {
      this.endRun('No inactive agents to unenroll');
      return;
    }
    this.logger.debug(
      `UnenrollInactiveAgentsTask. Found "${res.total}" inactive agents to unenroll`
    );
    return res;
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info(`[runTask()] started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      const res = await this.fetchAgentsWithUnenrollmentTimeout(esClient, soClient);

      this.logger.debug(`Attempting unenrollment of ${res?.total} inactive agents.`);
      const actionId = await unenrollBatch(soClient, esClient, res.agents, {
        revoke: true,
        force: true,
      });
      this.logger.debug(
        `Executed unenrollment of ${res?.total} inactive agents.with actionId: ${actionId}`
      );

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`Request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(err);
      this.endRun('error');
    }
  };
}
