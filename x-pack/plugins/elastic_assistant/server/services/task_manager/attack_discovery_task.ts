/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  LoggerFactory,
  ScopeableRequest,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { AttackDiscoveryPostRequestBody, Replacements } from '@kbn/elastic-assistant-common';
import { ActionsClientLlm } from '@kbn/langchain/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getFakeKibanaRequest } from './utils';
import { appContextService, GetRegisteredTools } from '../app_context';
import { ElasticAssistantPluginCoreSetupDependencies } from '../../types';
import { getLangSmithTracer } from '../../routes/evaluate/utils';
import { getLlmType } from '../../routes/utils';
import { getAssistantToolParams } from '../../routes/attack_discovery/helpers';
const scope = 'elasticAssistantAttackDiscovery';
export const AttackDiscoveryTaskConstants = {
  TITLE: 'Attack Discovery Background Task',
  TYPE: 'elastic-assistant:attack-discovery-task',
  VERSION: '1.0.0',
  SCOPE: [scope],
  TIMEOUT: '20m',
};

export const AttackDiscoveryTaskId = `${AttackDiscoveryTaskConstants.TYPE}:${AttackDiscoveryTaskConstants.VERSION}`;
const taskManagerQuery = {
  bool: {
    filter: {
      bool: {
        must: [
          {
            term: {
              'task.scope': scope,
            },
          },
        ],
      },
    },
  },
};
export interface AttackDiscoveryTaskSetupContract {
  core: ElasticAssistantPluginCoreSetupDependencies;
  logFactory: LoggerFactory;
  taskManager: TaskManagerSetupContract;
}

interface AttackDiscoveryParams {
  alertsIndexPattern: string;
  connectorId: string;
  pluginName: string;
  request: KibanaRequest;
  actionTypeId: AttackDiscoveryPostRequestBody['actionTypeId'];
  anonymizationFields: AttackDiscoveryPostRequestBody['anonymizationFields'];
  langSmithApiKey: AttackDiscoveryPostRequestBody['langSmithApiKey'];
  langSmithProject: AttackDiscoveryPostRequestBody['langSmithProject'];
  replacements: AttackDiscoveryPostRequestBody['replacements'];
  size: AttackDiscoveryPostRequestBody['size'];
  spaceId: string;
  connectorTimeout: number;
  langChainTimeout: number;
}

/**
 * This task is responsible for running the attack discovery API in a background task.
 *
 */
export class AttackDiscoveryTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private taskManager?: TaskManagerStartContract;
  private fakeRequest?: ScopeableRequest;

  constructor(setupContract: AttackDiscoveryTaskSetupContract) {
    const { core, logFactory, taskManager } = setupContract;
    this.logger = logFactory.get(this.taskId);

    this.logger.info(
      `Registering ${AttackDiscoveryTaskConstants.TYPE} task with timeout of [${AttackDiscoveryTaskConstants.TIMEOUT}].`
    );

    try {
      taskManager.registerTaskDefinitions({
        [AttackDiscoveryTaskConstants.TYPE]: {
          title: AttackDiscoveryTaskConstants.TITLE,
          timeout: AttackDiscoveryTaskConstants.TIMEOUT,
          createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
            this.logger.info(`createTaskRunner ${AttackDiscoveryTaskConstants.TYPE}.`);
            const apiKey = `dontcommitthis`;
            const basePathService = core.http.basePath;

            this.fakeRequest = getFakeKibanaRequest(
              basePathService,
              taskInstance.params.spaceId,
              apiKey
            );
            if (this.fakeRequest == null) {
              throw new Error(
                'An issue occurred creating the fake request for the Attack Discovery Tool'
              );
            }
            const getEsClient = () =>
              core.getStartServices().then(
                ([
                  {
                    elasticsearch: { client },
                  },
                  // TODO is this right?
                ]) => {
                  return client.asScoped(this.fakeRequest).asCurrentUser;
                }
              );
            const getActions = () =>
              core.getStartServices().then(([, startPlugins]) => startPlugins.actions);

            return {
              run: async () => {
                const actions = await getActions();
                const esClient = await getEsClient();
                this.logger.info(`createTaskRunner run ${AttackDiscoveryTaskConstants.TYPE}.`);
                return this.runTask({
                  taskInstance,
                  esClient,
                  getRegisteredTools: (pluginName: string) => {
                    return appContextService.getRegisteredTools(pluginName);
                  },
                  actions,
                });
              },
              cancel: async () => {
                this.logger.info(`createTaskRunner cancel ${AttackDiscoveryTaskConstants.TYPE}.`);
                this.logger.warn(`${AttackDiscoveryTaskConstants.TYPE} task was cancelled`);
              },
            };
          },
        },
      });
      this.logger.info(`Registered ${AttackDiscoveryTaskConstants.TYPE} task successfully!`);
    } catch (err) {
      this.logger.error(`Failed to register ${AttackDiscoveryTaskConstants.TYPE} task, ${err}`);
    }
  }

  public async start(taskManager: TaskManagerStartContract) {
    this.taskManager = taskManager;
  }

  public run = async (params: AttackDiscoveryParams) => {
    this.wasStarted = true;

    try {
      const currentTask = await this.taskManager?.schedule({
        taskType: AttackDiscoveryTaskConstants.TYPE,
        scope: AttackDiscoveryTaskConstants.SCOPE,
        state: { request: params.request },
        params: {
          version: AttackDiscoveryTaskConstants.VERSION,
          ...params,
        },
      });
      return currentTask;
    } catch (e) {
      this.logger.error(
        `Error scheduling task ${AttackDiscoveryTaskConstants.TYPE}, received ${e.message}`
      );
    }
  };

  public async statusCheck() {
    try {
      console.log('stephh statusCheck start');
      const statusCheckResult = await this.taskManager?.fetch({
        query: taskManagerQuery,
      });
      console.log('stephh statusCheck ned', statusCheckResult);
    } catch (e) {
      this.logger.error(
        `Error status checking task ${AttackDiscoveryTaskConstants.TYPE}, received ${e.message}`
      );
    }
  }

  private runTask = async ({
    actions,
    esClient,
    taskInstance,
    getRegisteredTools,
  }: {
    esClient: ElasticsearchClient;
    taskInstance: ConcreteTaskInstance;
    actions: ActionsPluginStart;
    getRegisteredTools: GetRegisteredTools;
  }) => {
    this.logger.info(`runTask start ${AttackDiscoveryTaskConstants.TYPE}.`);
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }
    let result;
    try {
      const {
        actionTypeId,
        alertsIndexPattern,
        anonymizationFields,
        connectorId,
        connectorTimeout,
        langChainTimeout,
        langSmithApiKey,
        langSmithProject,
        pluginName,
        replacements,
        size,
      } = taskInstance.params;

      let latestReplacements: Replacements = { ...replacements };
      const onNewReplacements = (newReplacements: Replacements) => {
        latestReplacements = { ...latestReplacements, ...newReplacements };
      };

      // get the attack discovery tool:
      const assistantTools = getRegisteredTools(pluginName);
      const assistantTool = assistantTools.find((tool) => tool.id === 'attack-discovery');
      if (!assistantTool) {
        throw new Error('attack discovery tool not found');
      }
      if (this.fakeRequest == null) {
        throw new Error(
          'An issue occurred creating the fake request for the Attack Discovery Tool'
        );
      }

      const traceOptions = {
        projectName: langSmithProject,
        tracers: [
          ...getLangSmithTracer({
            apiKey: langSmithApiKey,
            projectName: langSmithProject,
            logger: this.logger,
          }),
        ],
      };

      const llm = new ActionsClientLlm({
        actions,
        connectorId,
        llmType: getLlmType(actionTypeId),
        logger: this.logger,
        request: this.fakeRequest,
        temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
        timeout: connectorTimeout,
        traceOptions,
      });

      const assistantToolParams = getAssistantToolParams({
        alertsIndexPattern,
        anonymizationFields,
        esClient,
        latestReplacements,
        langChainTimeout,
        llm,
        onNewReplacements,
        request: { ...this.fakeRequest, body: { replacements } },
        size,
      });

      const toolInstance = assistantTool.getTool(assistantToolParams);
      const rawAttackDiscoveries = await toolInstance?.invoke('');
      if (rawAttackDiscoveries == null) {
        result = {
          isError: true,
          customError: {
            body: { message: 'tool returned no attack discoveries' },
            statusCode: 500,
          },
        };
        this.logger.info(`tool returned no attack discoveries`);
      } else {
        const { alertsContextCount, attackDiscoveries } = JSON.parse(rawAttackDiscoveries);
        result = {
          alertsContextCount,
          attackDiscoveries,
          connector_id: connectorId,
          replacements: latestReplacements,
        };
        this.logger.info(`Successfully ran attack discovery`);
      }
    } catch (err) {
      this.logger.error(`Failed to run attack discovery: ${err}`);
      result = {
        isError: true,
        customError: {
          // TODO - add more details to the error message
          body: { message: 'an error occurred' },
          statusCode: 500,
        },
      };
    }

    this.logger.info(`Task completed successfully!`);

    const state = result;
    console.log('stephh whole thing ends here', state);
    return { state };
  };

  private get taskId() {
    return AttackDiscoveryTaskId;
  }
}
