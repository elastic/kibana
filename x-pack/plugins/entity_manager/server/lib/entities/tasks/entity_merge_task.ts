/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  entitiesIndexPattern,
  ENTITY_INSTANCE,
  ENTITY_SCHEMA_VERSION_V1,
  EntityDefinition,
} from '@kbn/entities-schema';
import moment from 'moment';
import { EntityClient } from '../../entity_client';
import { EntityManagerServerSetup } from '../../../types';
import { getClientsFromAPIKey } from '../../utils';
import { readEntityDiscoveryAPIKey } from '../../auth';
import { EntityDiscoveryAPIKey } from '../../auth/api_key/api_key';

export const TASK_TYPE = 'EEM:ENTITY-MERGE-TASK';
const TASK_NAME = 'EEM: Entity merge task';

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
    const { targetIndex, apiKeyId, startedAt } = taskInstance.params;
    const { lastRunAt } = taskInstance.state;
    const apiKey = await readEntityDiscoveryAPIKey(this.server, apiKeyId);

    if (!apiKey) {
      throw new Error(`Unable to read ApiKey for ${apiKeyId}`);
    }

    const { esClient, soClient } = this.getScopedClients(apiKey);
    const entityClient = new EntityClient({ soClient, esClient, logger: this.logger });
    if (!entityClient) {
      throw new Error('Entity client is not intialized.');
    }

    this.logger.info(`Starting indexing`);

    const start = Date.now();
    const response = await entityClient.findEntities({
      perPage: 1000,
      query: lastRunAt ? `event.ingested > ${lastRunAt}` : '',
    });
    if (response.total) {
      const body = response.entities.reduce((acc, entity) => {
        if (entity) {
          acc.push({ update: { _index: targetIndex, _id: entity.entity.id } });
          acc.push({ doc: entity, doc_as_upsert: true });
        }
        if (
          entity?.event.ingested &&
          latestEventIngested &&
          moment(latestEventIngested).isBefore(moment(entity?.event?.ingested))
        ) {
          latestEventIngested = entity.event.ingested;
        }

        return acc;
      }, [] as any[]);
      const bulkResponse = await esClient?.bulk({ body, refresh: false });
    } else {
      this.logger.info('Nothing to update... skipping');
    }
    const end = Date.now();

    this.logger.info(`Finished in ${end - start}ms`);

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
  }

  public async start(
    definition: EntityDefinition,
    request: KibanaRequest,
    server: EntityManagerServerSetup
  ) {
    if (!server.taskManager) {
      throw new Error('Missing required service during startup, skipping task.');
    }

    try {
      this.taskManager = server.taskManager;
      const taskId = this.createTaskId(definition);
      this.logger.info(`Scheduling ${TASK_NAME} for ${definition.name} (${definition.id})`);
      await this.taskManager.ensureScheduled({
        id: taskId,
        taskType: TASK_TYPE,
        schedule: {
          interval: '1m',
        },
        scope: ['observability', 'entityManager'],
        state: {},
        params: {
          apiKeyId: definition.apiKeyId,
          targetIndex: entitiesIndexPattern({
            schemaVersion: ENTITY_SCHEMA_VERSION_V1,
            dataset: ENTITY_INSTANCE,
            definitionId: definition.id,
          }),
        },
      });
      return taskId;
    } catch (e) {
      this.logger.info(`[EEM] ${e.message}`);
      throw e;
    }
  }
}
