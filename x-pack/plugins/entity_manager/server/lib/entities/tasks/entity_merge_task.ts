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
import { EntityDefinition } from '@kbn/entities-schema';
import moment from 'moment';
import { EntityManagerServerSetup } from '../../../types';
import { getClientsFromAPIKey } from '../../utils';
import { readEntityDiscoveryAPIKey } from '../../auth';
import { EntityDiscoveryAPIKey } from '../../auth/api_key/api_key';
import { ENTITY_DISCOVERY_API_KEY_SO_ID } from '../../auth/api_key/saved_object';
import { scrollEntities } from './lib/scroll_entities';
import { generateInstanceIndexName } from '../helpers/generate_component_id';

export const TASK_TYPE = 'EEM:ENTITY-MERGE-TASK';
const TASK_NAME = 'EntityMergeTask';

export class EntityMergeTask {
  private abortController = new AbortController();
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private server: EntityManagerServerSetup;

  constructor(taskManager: TaskManagerSetupContract, server: EntityManagerServerSetup) {
    this.logger = server.logger;
    this.server = server;

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: TASK_NAME,
        timeout: '1m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance);
            },

            cancel: async () => {
              this.abortController.abort('[SLO] Definitions clean up Task timed out');
            },
          };
        },
      },
    });
  }

  private async runTask(taskInstance: ConcreteTaskInstance) {
    let latestEventIngested: string | undefined;
    const { targetIndex, apiKeyId, definitionId } = taskInstance.params;
    const { lastRunAt } = taskInstance.state;
    const apiKey = await readEntityDiscoveryAPIKey(this.server, apiKeyId);

    if (!apiKey) {
      throw new Error(`Unable to read ApiKey for ${apiKeyId}`);
    }

    const { esClient } = this.getScopedClients(apiKey);
    this.logger.info(`Starting indexing`);
    const start = Date.now();
    let entitiesProcessed = 0;
    for await (const hits of scrollEntities(esClient.asCurrentUser, lastRunAt, definitionId)) {
      const body = hits.reduce((acc, { _source: entityDoc }) => {
        if (entityDoc) {
          acc.push({ update: { _index: targetIndex, _id: entityDoc.entity.id } });
          acc.push({
            doc: {
              ...(entityDoc as object),
              event: { ...entityDoc.event, ingested: moment().toISOString() },
            },
            doc_as_upsert: true,
          });
          if (
            entityDoc?.event.ingested &&
            latestEventIngested &&
            moment(latestEventIngested).isBefore(moment(entityDoc?.event?.ingested))
          ) {
            latestEventIngested = entityDoc.event.ingested;
          }
        }

        return acc;
      }, [] as any[]);
      await esClient?.asCurrentUser.bulk({ body, refresh: false });
      entitiesProcessed += hits.length;
    }
    const end = Date.now();
    this.logger.info(`Finished in ${end - start}ms – Processed ${entitiesProcessed} entities`);

    return {
      state: {
        lastRunAt: latestEventIngested,
      },
    };
  }

  private getScopedClients(apiKey: EntityDiscoveryAPIKey) {
    return getClientsFromAPIKey({ apiKey, server: this.server });
  }

  private createTaskId(definition: EntityDefinition) {
    return `${TASK_TYPE}:${definition.id}`;
  }

  public async stop(definition: EntityDefinition) {
    await this.taskManager?.removeIfExists(this.createTaskId(definition));
    this.logger.info(`Deleting ${TASK_NAME} for ${definition.name} (${definition.id})`);
  }

  public async start(
    definition: EntityDefinition,
    server: EntityManagerServerSetup,
    isRetry = false
  ): Promise<string> {
    if (!server.taskManager) {
      throw new Error('Missing required service during startup, skipping task.');
    }

    try {
      this.taskManager = server.taskManager;
      const taskId = this.createTaskId(definition);
      const apiKeyId = definition.apiKeyId || ENTITY_DISCOVERY_API_KEY_SO_ID;
      this.logger.info(`Scheduling ${TASK_NAME} for ${definition.name} (${definition.id})`);
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
          targetIndex: generateInstanceIndexName(definition),
        },
      });
      return taskId;
    } catch (e) {
      if (e.meta.statusCode === 409 && isRetry === false) {
        await this.taskManager?.removeIfExists(this.createTaskId(definition));
        return await this.start(definition, server);
      }
      this.logger.info(`[EEM] ${e.message}`);
      throw e;
    }
  }
}
