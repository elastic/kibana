/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import moment = require('moment');
import { StreamEntitiesManagerServer } from '../../../types';
import { getClientsFromAPIKey } from '../../utils';
import { APIKey } from '../../auth/api_key/api_key';
import {
  SEM_API_KEY_SO_ID,
  readStreamEntitiesManagerAPIKey,
} from '../../auth/api_key/saved_object';
import { findDefinitionById } from '../find_definition_by_id';
import { DefinitionNotFound } from '../errors';
import { createDocsFromApiDefinition } from './lib/create_docs_from_api_definition';
import { ApiScraperDefinition } from '../../../../common/types';

export const TASK_TYPE = 'StreamEntitiesManager:API-SCRAPER-TASK';
const TASK_NAME = 'StreamEntitiesManagerTask';

interface ApiScraperTaskInstance extends ConcreteTaskInstance {
  params: {
    apiKeyId: string;
    definitionId: string;
  };
}

export class ApiScraperTask {
  private abortController = new AbortController();
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private server: StreamEntitiesManagerServer;

  constructor(taskManager: TaskManagerSetupContract, server: StreamEntitiesManagerServer) {
    this.logger = server.logger;
    this.server = server;

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: TASK_NAME,
        timeout: '1m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ApiScraperTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance);
            },

            cancel: async () => {
              this.abortController.abort(
                `[${taskInstance.params.definitionId}] StreamEntitiesManagerTask timed out.`
              );
            },
          };
        },
      },
    });
  }

  private async runTask(taskInstance: ApiScraperTaskInstance) {
    const { apiKeyId, definitionId } = taskInstance.params;
    try {
      this.logger.info(`[${definitionId}] Starting indexing`);
      const start = Date.now();

      const apiKey = await readStreamEntitiesManagerAPIKey(this.server, apiKeyId);

      if (!apiKey) {
        throw new Error(`[${definitionId}] Unable to read ApiKey for ${apiKeyId}`);
      }

      const definition = await this.fetchDefintion(apiKey, definitionId);
      const { scopedClusterClient } = this.getScopedClients(apiKey);

      const docs = await createDocsFromApiDefinition(
        scopedClusterClient.asSecondaryAuthUser,
        definition
      );
      const now = moment();
      const targetIndex = `.${definition.id}`;
      if (docs.length > 0) {
        const body = docs.reduce((acc: any[], doc: { id: string }) => {
          acc.push({ update: { _index: targetIndex, _id: doc.id } });
          acc.push({
            doc: {
              ...(doc as object),
              event: { ingested: now.toISOString() },
            },
            doc_as_upsert: true,
          });
          return acc;
        }, []);
        const response = await scopedClusterClient.asCurrentUser.bulk({ body, refresh: false });
        if (this.logger.isLevelEnabled('trace')) {
          response.items.forEach((item) => {
            this.logger.trace(
              `[${definitionId}] Bulk opperation for ${item.update._id} was "${
                item.update.result
              }" ${JSON.stringify(item.update)}`
            );
          });
        }
      }
      const end = Date.now();
      this.logger.info(
        `[${definition.id}] Finished in ${end - start}ms – Processed ${docs.length} entities`
      );

      return {
        state: {},
      };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        this.logger.error(`[${definitionId}] ${e.message} – This task should have been deleted.`);
        return {
          state: {},
        };
      }
      throw e;
    }
  }

  private async fetchDefintion(apiKey: APIKey, id: string) {
    const { soClient } = this.getScopedClients(apiKey);
    return findDefinitionById({ id, soClient });
  }

  private getScopedClients(apiKey: APIKey) {
    return getClientsFromAPIKey({ apiKey, server: this.server });
  }

  private createTaskId(definition: ApiScraperDefinition) {
    return `${TASK_TYPE}:${definition.id}`;
  }

  public async stop(definition: ApiScraperDefinition) {
    await this.taskManager?.removeIfExists(this.createTaskId(definition));
    this.logger.info(`Deleting ${TASK_NAME} for ${definition.name} (${definition.id})`);
  }

  public async start(
    definition: ApiScraperDefinition,
    server: StreamEntitiesManagerServer,
    isRetry = false
  ): Promise<string> {
    if (!server.taskManager) {
      throw new Error(`[${definition.id}] required service during startup, skipping task.`);
    }

    try {
      this.stop(definition);
      this.taskManager = server.taskManager;
      const taskId = this.createTaskId(definition);
      const apiKeyId = definition.apiKeyId || SEM_API_KEY_SO_ID;
      this.logger.info(
        `[${definition.id}] Scheduling ${TASK_NAME} for ${definition.name} (${definition.id})`
      );
      await this.taskManager.schedule({
        id: taskId,
        taskType: TASK_TYPE,
        schedule: {
          interval: '1m',
        },
        scope: ['observability', 'streamEntitiesManager'],
        state: {},
        params: {
          apiKeyId,
          definitionId: definition.id,
        },
      });
      return taskId;
    } catch (e) {
      if (e.meta.statusCode === 409 && isRetry === false) {
        await this.taskManager?.removeIfExists(this.createTaskId(definition));
        return await this.start(definition, server);
      }
      this.logger.error(`[Stream Entities Manager][${definition.id}]  ${e.message}`);
      throw e;
    }
  }
}
