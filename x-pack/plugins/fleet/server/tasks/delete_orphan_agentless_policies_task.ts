/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, type CoreSetup, type Logger } from '@kbn/core/server';
import type { ElasticsearchClient, LoggerFactory } from '@kbn/core/server';

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  type ConcreteTaskInstance,
  type TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';

import { errors } from '@elastic/elasticsearch';

import { agentPolicyService, packagePolicyService } from '../services';
import { agentlessAgentService } from '../services/agents/agentless_agent';
import { getAgentPolicySavedObjectType } from '../services/agent_policy';
import type { AgentPolicy } from '../types';
import { agentPolicyUpdateEventHandler } from '../services/agent_policy_update';

export const DELETED_AGENTLESS_POLICIES_TASK_TYPE =
  'cloud-security:deleted-orphan-agentless-policies-task';
export const DELETE_AGENTLESS_POLICIES_TASK_VERSION = '1.0.0';
const TITLE = 'Cloud Security Delete Orphan Agentless Policies Task';
const TIMEOUT = '2m';
const INTERVAL = '1d';
const LOGGER_SUBJECT = '[DeletedOrphanAgentlessPoliciesTask]';
const BATCH_SIZE = 5;

interface DeleteOrphanAgentlessPoliciesTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface DeleteOrphanAgentlessPoliciesTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class DeleteOrphanAgentlessPoliciesTask {
  private logger: Logger;
  private startedTaskRunner: boolean = false;
  private abortController = new AbortController();

  constructor(setupContract: DeleteOrphanAgentlessPoliciesTaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);

    taskManager.registerTaskDefinitions({
      [DELETED_AGENTLESS_POLICIES_TASK_TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController.abort(`${TITLE} timed out`);
            },
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: DeleteOrphanAgentlessPoliciesTaskStartContract) => {
    if (!taskManager) {
      this.logger.error(`${LOGGER_SUBJECT} Missing required service during start`);
    }

    this.startedTaskRunner = true;
    this.logger.info(`${LOGGER_SUBJECT} Started with interval of [${INTERVAL}]`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: DELETED_AGENTLESS_POLICIES_TASK_TYPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {},
        params: { version: DELETE_AGENTLESS_POLICIES_TASK_VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task ${LOGGER_SUBJECT}, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${DELETED_AGENTLESS_POLICIES_TASK_TYPE}:${DELETE_AGENTLESS_POLICIES_TASK_VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`${LOGGER_SUBJECT} runTask ended${msg ? ': ' + msg : ''}`);
  }

  private processInBatches = async (
    {
      esClient,
      soClient,
      orphanAgentlessPolicies,
      savedObjectType,
    }: {
      esClient: ElasticsearchClient;
      soClient: SavedObjectsClient;
      orphanAgentlessPolicies: AgentPolicy[];
      savedObjectType: 'fleet-agent-policies' | 'ingest-agent-policies';
    },
    batchSize: number,
    processFunction: (
      esClient: ElasticsearchClient,
      soClient: SavedObjectsClient,
      orphanPolicy: AgentPolicy,
      savedObjectType: 'fleet-agent-policies' | 'ingest-agent-policies'
    ) => void
  ) => {
    for (let i = 0; i < orphanAgentlessPolicies.length; i += batchSize) {
      const currentBatch = orphanAgentlessPolicies.slice(i, i + batchSize);

      await Promise.allSettled(
        currentBatch.map((orphanPolicy) =>
          processFunction(esClient, soClient, orphanPolicy, savedObjectType)
        )
      );
    }
  };

  private processOrphanAgentlessPoliciesDeletion = async (
    soClient: SavedObjectsClient,
    esClient: ElasticsearchClient
  ) => {
    const SAVED_OBJECT_TYPE = await getAgentPolicySavedObjectType();

    const policiesKuery = `${SAVED_OBJECT_TYPE}.supports_agentless: true`;

    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(soClient, {
      kuery: policiesKuery,
      perPage: BATCH_SIZE,
    });

    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      this.logger.debug(
        `[${LOGGER_SUBJECT}] Found "${agentPolicyPageResults.length}" agentless policies`
      );

      if (!agentPolicyPageResults.length) {
        this.endRun('Found no agentless policies to process');
        return;
      }

      const orphanAgentlessPolicies = agentPolicyPageResults.filter(async (agentPolicy) => {
        return !!agentPolicy.package_policies?.length && agentPolicy.package_policies?.length <= 1;
      });

      if (!orphanAgentlessPolicies.length) {
        this.endRun('Found no orphan agentless policies to delete');
        return;
      }

      this.logger.info(`[runTask()] started`);

      await this.processInBatches(
        {
          esClient,
          soClient,
          orphanAgentlessPolicies,
          savedObjectType: SAVED_OBJECT_TYPE,
        },
        BATCH_SIZE,
        this.deleteOrphanAgentlessPolicies
      );
    }
  };

  private deleteOrphanAgentlessPolicies = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClient,
    agentPolicy: AgentPolicy,
    saveObjectType: 'fleet-agent-policies' | 'ingest-agent-policies'
  ) => {
    this.logger.debug(`${agentPolicy.id} agentless policy id`);

    const packagePolicies = await packagePolicyService.findAllForAgentPolicy(
      soClient,
      agentPolicy.id
    );
    // Delete Orphan Package Policies with system integration or no integrations policies installed
    if (
      packagePolicies.length === 0 ||
      (packagePolicies.length === 1 && packagePolicies?.[0]?.package?.name === 'system')
    ) {
      if (!!agentPolicy.agents) {
        // Unenroll Orphan Agent Policy
        await agentPolicyUpdateEventHandler(esClient, 'deleted', agentPolicy.id, {
          skipDeploy: true,
          spaceId: soClient.getCurrentNamespace(),
        });

        // Delete agentless deployments
        try {
          this.logger.info(`${LOGGER_SUBJECT} deleting agentless deployments`);
          await agentlessAgentService.deleteAgentlessAgent(agentPolicy.id);
          this.endRun('successfully deleted agentless deployment');
        } catch (e) {
          if (e instanceof errors.RequestAbortedError) {
            this.logger.error(`${LOGGER_SUBJECT} request aborted due to timeout: ${e}`);
            this.endRun();
            return;
          }
          this.logger.error(
            `${LOGGER_SUBJECT} Failed to deleted agentless deployment ${agentPolicy.id} error: ${e}`
          );
        }
      }

      // Delete Package Policy
      if (packagePolicies?.length) {
        try {
          this.logger.info(
            `${LOGGER_SUBJECT} deleting package policy for agentless policy ${agentPolicy.id}`
          );
          await packagePolicyService.delete(
            soClient,
            esClient,
            packagePolicies.map((p) => p.id),
            {
              force: true,
              skipUnassignFromAgentPolicies: true,
            }
          );
          this.logger.info(
            `${LOGGER_SUBJECT} deleting package policy for agentless policy ${agentPolicy.id}`
          );
        } catch (e) {
          this.logger.error(
            `${LOGGER_SUBJECT} Failed to deleted package policy for agentless policy ${agentPolicy.id} error: ${e}`
          );
        }
      }

      // Delete Agentless Policy from the Saved Object and .fleet-policies index
      try {
        this.logger.info(`${LOGGER_SUBJECT} deleting agentless policy save object and docs`);
        await soClient.delete(`${saveObjectType}`, agentPolicy.id, {
          force: true, // need to delete through multiple space
        });

        await agentPolicyService.deleteFleetServerPoliciesForPolicyId(esClient, agentPolicy.id);
        this.endRun('successfully deleted agentless policy');
      } catch (e) {
        if (e instanceof errors.RequestAbortedError) {
          this.logger.error(`${LOGGER_SUBJECT} request aborted due to timeout: ${e}`);
          this.endRun();
          return;
        }
        this.logger.error(
          `${LOGGER_SUBJECT} Failed to delete agentless policy - ${agentPolicy.id} error: ${e}`
        );
      }
    }
  };

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!this.startedTaskRunner) {
      this.logger.debug(`${LOGGER_SUBJECT} runTask Aborted. Task not started yet`);
      return;
    }

    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `${LOGGER_SUBJECT} Outdated task version: Received [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }
    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    await this.processOrphanAgentlessPoliciesDeletion(soClient, esClient);
  };
}
