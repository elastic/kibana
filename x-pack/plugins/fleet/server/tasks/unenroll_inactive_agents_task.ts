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

import { AGENTS_PREFIX, AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import { getAgentsByKuery } from '../services/agents';
import { unenrollBatch } from '../services/agents/unenroll_action_runner';
import { agentPolicyService } from '../services';

export const TYPE = 'fleet:unenroll-inactive-agents-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Unenroll Inactive Agent Task';
const SCOPE = ['fleet'];
const INTERVAL = '10m';
const TIMEOUT = '1m';
const POLICIES_BATCHSIZE = 100;
const UNENROLLMENT_BATCHSIZE = 1000;

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
      this.logger.error('[UnenrollInactiveAgentsTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(`[UnenrollInactiveAgentsTask] Started with interval of [${INTERVAL}]`);

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
      this.logger.error(`Error scheduling task UnenrollInactiveAgentsTask, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`[UnenrollInactiveAgentsTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public async unenrollInactiveAgents(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
    this.logger.debug(
      `[UnenrollInactiveAgentsTask] Fetching agent policies with unenroll_timeout > 0`
    );
    // find all agent policies that are not managed and having unenroll_timeout > 0
    // limit batch size to 100 to avoid scale issues
    const policiesKuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed: false AND ${AGENT_POLICY_SAVED_OBJECT_TYPE}.unenroll_timeout > 0`;
    const agentPolicies = await agentPolicyService.list(soClient, {
      kuery: policiesKuery,
      perPage: POLICIES_BATCHSIZE,
    });

    this.logger.debug(
      `[UnenrollInactiveAgentsTask] Found "${agentPolicies.items.length}" agent policies with unenroll_timeout > 0`
    );
    if (!agentPolicies?.items.length) {
      this.endRun('Found no policies to process');
      return;
    }

    // find inactive agents enrolled on above policies
    // limit batch size to 1000 to avoid scale issues
    const kuery = `(${AGENTS_PREFIX}.policy_id:${agentPolicies.items
      .map((policy) => `"${policy.id}"`)
      .join(' or ')}) and ${AGENTS_PREFIX}.status: inactive`;
    const res = await getAgentsByKuery(esClient, soClient, {
      kuery,
      showInactive: true,
      page: 1,
      perPage: UNENROLLMENT_BATCHSIZE,
    });
    if (!res.agents.length) {
      this.endRun('No inactive agents to unenroll');
      return;
    }
    this.logger.debug(
      `[UnenrollInactiveAgentsTask] Found "${res.agents.length}" inactive agents to unenroll. Attempting unenrollment`
    );
    const actionId = await unenrollBatch(soClient, esClient, res.agents, {
      revoke: true,
      force: true,
    });
    this.logger.debug(
      `[UnenrollInactiveAgentsTask] Executed unenrollment of inactive agents with actionId: ${actionId}`
    );
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!this.wasStarted) {
      this.logger.debug('[UnenrollInactiveAgentsTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info(`[runTask()] started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      await this.unenrollInactiveAgents(esClient, soClient);

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[UnenrollInactiveAgentsTask] request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[UnenrollInactiveAgentsTask] error: ${err}`);
      this.endRun('error');
    }
  };
}
