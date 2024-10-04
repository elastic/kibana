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
import { ApiScraperServer } from '../../../types';
import { getClientsFromAPIKey } from '../../utils';
import { ApiScraperAPIKey } from '../../auth/api_key/api_key';
import { API_SCRAPER_API_KEY_SO_ID, readApiScraperAPIKey } from '../../auth/api_key/saved_object';
import { findApiScraperDefinitionById } from '../find_api_scraper_definition_by_id';
import { ApiDefinitionNotFound } from '../errors/api_scraper_not_found';
import { createDocsFromApiDefinition } from './lib/create_docs_from_api_definition';
import { ApiScraperDefinition } from '../../../../common/types';

export const TASK_TYPE = 'ApiScraper:API-SCRAPER-TASK';
const TASK_NAME = 'ApiScraperTask';

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
  private server: ApiScraperServer;

  constructor(taskManager: TaskManagerSetupContract, server: ApiScraperServer) {
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
                `[${taskInstance.params.definitionId}] ApiScraperTask timed out.`
              );
            },
          };
        },
      },
    });
  }

  private async runTask(taskInstance: ApiScraperTaskInstance) {
    try {
      this.logger.info(`Starting indexing`);
      const start = Date.now();

      const { apiKeyId, definitionId } = taskInstance.params;
      const apiKey = await readApiScraperAPIKey(this.server, apiKeyId);

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
        await scopedClusterClient.asCurrentUser.bulk({ body, refresh: false });
      }
      const end = Date.now();
      this.logger.info(`Finished in ${end - start}ms – Processed ${docs.length} entities`);

      return {
        state: {},
      };
    } catch (e) {
      if (e instanceof ApiDefinitionNotFound) {
        this.logger.error(`${e.message} – This task should have been deleted.`);
        return {
          state: {},
        };
      }
      throw e;
    }
  }

  private async fetchDefintion(apiKey: ApiScraperAPIKey, id: string) {
    const { soClient } = this.getScopedClients(apiKey);
    return findApiScraperDefinitionById({ id, soClient });
  }

  private getScopedClients(apiKey: ApiScraperAPIKey) {
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
    server: ApiScraperServer,
    isRetry = false
  ): Promise<string> {
    if (!server.taskManager) {
      throw new Error(`[${definition.id}] required service during startup, skipping task.`);
    }

    try {
      this.stop(definition);
      this.taskManager = server.taskManager;
      const taskId = this.createTaskId(definition);
      const apiKeyId = definition.apiKeyId || API_SCRAPER_API_KEY_SO_ID;
      this.logger.info(
        `[${definition.id}] Scheduling ${TASK_NAME} for ${definition.name} (${definition.id})`
      );
      await this.taskManager.schedule({
        id: taskId,
        taskType: TASK_TYPE,
        schedule: {
          interval: '1m',
        },
        scope: ['observability', 'apiScraper'],
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
      this.logger.error(`[Api Scraper][${definition.id}]  ${e.message}`);
      throw e;
    }
  }
}
