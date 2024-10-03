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
import { APIEntityDefinition, EntityLatestDoc } from '@kbn/entities-schema';
import moment = require('moment');
import { EntityManagerServer } from '../../../types';
import { getClientsFromAPIKey } from '../../utils';
import { EntityDiscoveryAPIKey } from '../../auth/api_key/api_key';
import {
  ENTITY_DISCOVERY_API_KEY_SO_ID,
  readEntityDiscoveryAPIKey,
} from '../../auth/api_key/saved_object';
import { generateInstanceIndexName } from '../helpers/generate_component_id';
import { findApiEntityDefinitionById } from '../find_entity_definition';
import { EntityDefinitionNotFound } from '../errors/entity_not_found';
import { createEntitiesFromApiDefinition } from './lib/create_entities_from_api_definition';

export const TASK_TYPE = 'EEM:ENTITY-ELASTICSEARCH-API-TASK';
const TASK_NAME = 'EntityElasticsearchApiTask';

interface EntityElasticsearchApiTaskInstance extends ConcreteTaskInstance {
  params: {
    apiKeyId: string;
    definitionId: string;
  };
}

export class EntityElasticsearchApiTask {
  private abortController = new AbortController();
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private server: EntityManagerServer;

  constructor(taskManager: TaskManagerSetupContract, server: EntityManagerServer) {
    this.logger = server.logger;
    this.server = server;

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: TASK_NAME,
        timeout: '1m',
        maxAttempts: 1,
        createTaskRunner: ({
          taskInstance,
        }: {
          taskInstance: EntityElasticsearchApiTaskInstance;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance);
            },

            cancel: async () => {
              this.abortController.abort(
                `[${taskInstance.params.definitionId}] EntityMergeTask timed out.`
              );
            },
          };
        },
      },
    });
  }

  private async runTask(taskInstance: EntityElasticsearchApiTaskInstance) {
    try {
      this.logger.info(`Starting indexing`);
      const start = Date.now();

      const { apiKeyId, definitionId } = taskInstance.params;
      const apiKey = await readEntityDiscoveryAPIKey(this.server, apiKeyId);

      if (!apiKey) {
        throw new Error(`[${definitionId}] Unable to read ApiKey for ${apiKeyId}`);
      }

      const definition = await this.fetchDefintion(apiKey, definitionId);
      const { esClient } = this.getScopedClients(apiKey);

      const docs = await createEntitiesFromApiDefinition(esClient.asSecondaryAuthUser, definition);
      const now = moment();
      const targetIndex = generateInstanceIndexName(definition);
      if (docs.length > 0) {
        const body = docs.reduce((acc: any[], doc: EntityLatestDoc) => {
          acc.push({ update: { _index: targetIndex, _id: doc.entity.id } });
          acc.push({
            doc: {
              ...(doc as object),
              event: { ingested: now.toISOString() },
            },
            doc_as_upsert: true,
          });
          return acc;
        }, []);
        await esClient?.asCurrentUser.bulk({ body, refresh: false });
      }
      const end = Date.now();
      this.logger.info(`Finished in ${end - start}ms – Processed ${docs.length} entities`);

      return {
        state: {},
      };
    } catch (e) {
      if (e instanceof EntityDefinitionNotFound) {
        this.logger.error(`${e.message} – This task should have been deleted.`);
        return {
          state: {},
        };
      }
      throw e;
    }
  }

  private async fetchDefintion(apiKey: EntityDiscoveryAPIKey, id: string) {
    const { soClient } = this.getScopedClients(apiKey);
    return findApiEntityDefinitionById({ id, soClient });
  }

  private getScopedClients(apiKey: EntityDiscoveryAPIKey) {
    return getClientsFromAPIKey({ apiKey, server: this.server });
  }

  private createTaskId(definition: APIEntityDefinition) {
    return `${TASK_TYPE}:${definition.id}`;
  }

  public async stop(definition: APIEntityDefinition) {
    await this.taskManager?.removeIfExists(this.createTaskId(definition));
    this.logger.info(`Deleting ${TASK_NAME} for ${definition.name} (${definition.id})`);
  }

  public async start(
    definition: APIEntityDefinition,
    server: EntityManagerServer,
    isRetry = false
  ): Promise<string> {
    if (!server.taskManager) {
      throw new Error(`[${definition.id}] required service during startup, skipping task.`);
    }

    try {
      this.stop(definition);
      this.taskManager = server.taskManager;
      const taskId = this.createTaskId(definition);
      const apiKeyId = definition.apiKeyId || ENTITY_DISCOVERY_API_KEY_SO_ID;
      this.logger.info(
        `[${definition.id}] Scheduling ${TASK_NAME} for ${definition.name} (${definition.id})`
      );
      await this.taskManager.schedule({
        id: taskId,
        taskType: TASK_TYPE,
        schedule: {
          interval: '1m',
        },
        scope: ['observability', 'entityManager'],
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
      this.logger.error(`[EEM][${definition.id}]  ${e.message}`);
      throw e;
    }
  }
}
