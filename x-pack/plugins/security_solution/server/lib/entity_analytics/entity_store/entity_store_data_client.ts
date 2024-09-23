/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type {
  InitEntityEngineRequestBody,
  InitEntityEngineResponse,
} from '../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import type {
  EntityType,
  InspectQuery,
} from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { EngineDescriptorClient } from './saved_object/engine_descriptor';
import { getEntitiesIndexName } from './utils/utils';
import { ENGINE_STATUS, MAX_SEARCH_RESPONSE_SIZE } from './constants';
import type { AssetCriticalityEcsMigrationClient } from '../asset_criticality/asset_criticality_migration_client';
import { getDefinitionForEntityType } from './definition';
import {
  createFieldRetentionEnrichPolicy,
  executeFieldRetentionEnrichPolicy,
  getFieldRetentionPipelineSteps,
} from './field_retention';
import { getEntityIndexMapping } from './index_mappings';
import { startEntityStoreFieldRetentionEnrichTask } from './field_retention/task/field_retention_enrichment_task';

interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  entityClient: EntityClient;
  assetCriticalityMigrationClient: AssetCriticalityEcsMigrationClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

interface SearchEntitiesParams {
  entityTypes: EntityType[];
  filterQuery?: string;
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: SortOrder;
}

export class EntityStoreDataClient {
  private engineClient: EngineDescriptorClient;

  constructor(private readonly options: EntityStoreClientOpts) {
    this.engineClient = new EngineDescriptorClient({
      soClient: options.soClient,
      namespace: options.namespace,
    });
  }

  public async init(
    entityType: EntityType,
    taskManager: TaskManagerStartContract, // TODO: @tiansivive I have put this as ana argument because it seems a shame to require it in the constructor
    { indexPattern = '', filter = '' }: InitEntityEngineRequestBody
  ): Promise<InitEntityEngineResponse> {
    const { entityClient, assetCriticalityMigrationClient, logger } = this.options;
    const requiresMigration = await assetCriticalityMigrationClient.isEcsDataMigrationRequired();

    if (requiresMigration) {
      throw new Error(
        'Asset criticality data migration is required before initializing entity store. If this error persists, please restart Kibana.'
      );
    }

    const definition = getDefinitionForEntityType(entityType, this.options.namespace);
    const { logger, entityClient } = this.options;

    logger.info(`Initializing entity store for ${entityType}`);

    const descriptor = await this.engineClient.init(entityType, definition, filter);
    logger.debug(`Initialized engine for ${entityType}`);
    // first create the entity definition without starting it
    // so that the index template is created which we can add a component template to
    await entityClient.createEntityDefinition({
      definition: {
        ...definition,
        filter,
        indexPatterns: indexPattern
          ? [...definition.indexPatterns, ...indexPattern.split(',')]
          : definition.indexPatterns,
      },
      installOnly: true,
    });
    logger.debug(`Created entity definition for ${entityType}`);

    // the index must be in place with the correct mapping before the enrich policy is created
    // this is because the enrich policy will fail if the index does not exist with the correct fields
    await this.createEntityIndexComponentTemplate({ entityType });
    logger.debug(`Created entity index component template for ${entityType}`);
    await this.createEntityIndex({ entityType });
    logger.debug(`Created entity index for ${entityType}`);

    // we must create and execute the enrich policy before the pipeline is created
    // this is because the pipeline will fail if the enrich index does not exist
    await this.createFieldRetentionEnrichPolicy({ entityType });
    logger.debug(`Created field retention enrich policy for ${entityType}`);
    await this.executeFieldRetentionEnrichPolicy({ entityType });
    logger.debug(`Executed field retention enrich policy for ${entityType}`);
    await this.createPlatformPipeline({ entityType });
    logger.debug(`Created @platform pipeline for ${entityType}`);

    // finally start the entity definition now that everything is in place
    await this.start(entityType, { force: true });
    logger.debug(`Started entity definition for ${entityType}`);

    // the task will execute the enrich policy on a schedule
    await startEntityStoreFieldRetentionEnrichTask({
      namespace: this.options.namespace,
      logger,
      taskManager,
    });
    logger.debug(`Started entity store field retention enrich task for ${entityType}`);

    // and finally update the engine status to started once everything is in place
    const updated = await this.engineClient.update(definition.id, ENGINE_STATUS.STARTED);
    logger.debug(`Updated engine status to 'started' for ${entityType}, initialisation complete`);
    logger.info(`Entity store for ${entityType} initialized`);
    return { ...descriptor, ...updated };
  }

  public executeFieldRetentionEnrichPolicy({ entityType }: { entityType: EntityType }) {
    return executeFieldRetentionEnrichPolicy({
      spaceId: this.options.namespace,
      esClient: this.options.esClient,
      entityType,
    });
  }

  public async createFieldRetentionEnrichPolicy({ entityType }: { entityType: EntityType }) {
    return createFieldRetentionEnrichPolicy({
      spaceId: this.options.namespace,
      esClient: this.options.esClient,
      entityType,
    });
  }

  private async createPlatformPipeline({ entityType }: { entityType: EntityType }) {
    const definition = getDefinitionForEntityType(entityType, this.options.namespace);

    await this.options.esClient.ingest.putPipeline({
      id: `${definition.id}-latest@platform`,
      body: {
        _meta: {
          managed_by: 'entity_store',
          managed: true,
        },
        description: `Ingest pipeline for entity defiinition ${definition.id}`,
        processors: getFieldRetentionPipelineSteps({ spaceId: this.options.namespace, entityType }),
      },
    });
  }

  private async createEntityIndex({ entityType }: { entityType: EntityType }) {
    await this.options.esClient.indices.create({
      index: getEntitiesIndexName(entityType, this.options.namespace),
      body: {},
    });
  }

  private async createEntityIndexComponentTemplate({ entityType }: { entityType: EntityType }) {
    const definition = getDefinitionForEntityType(entityType, this.options.namespace);

    await this.options.esClient.cluster.putComponentTemplate({
      name: `${definition.id}-latest@platform`,
      body: {
        template: {
          mappings: getEntityIndexMapping(entityType),
        },
      },
    });
  }

  public async start(entityType: EntityType, options?: { force: boolean }) {
    const definition = getDefinitionForEntityType(entityType, this.options.namespace);

    const descriptor = await this.engineClient.get(entityType);

    if (!options?.force && descriptor.status !== ENGINE_STATUS.STOPPED) {
      throw new Error(
        `Cannot start Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.options.logger.info(`Starting entity store for ${entityType}`);
    await this.options.entityClient.startEntityDefinition(definition);

    return this.engineClient.update(definition.id, ENGINE_STATUS.STARTED);
  }

  public async stop(entityType: EntityType) {
    const definition = getDefinitionForEntityType(entityType, this.options.namespace);

    const descriptor = await this.engineClient.get(entityType);

    if (descriptor.status !== ENGINE_STATUS.STARTED) {
      throw new Error(
        `Cannot stop Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.options.logger.info(`Stopping entity store for ${entityType}`);
    await this.options.entityClient.stopEntityDefinition(definition);

    return this.engineClient.update(definition.id, ENGINE_STATUS.STOPPED);
  }

  public async get(entityType: EntityType) {
    return this.engineClient.get(entityType);
  }

  public async list() {
    return this.engineClient.list();
  }

  public async delete(entityType: EntityType, deleteData: boolean) {
    const { id } = getDefinitionForEntityType(entityType, this.options.namespace);

    this.options.logger.info(`Deleting entity store for ${entityType}`);

    await this.options.entityClient.deleteEntityDefinition({ id, deleteData });
    await this.engineClient.delete(id);

    return { deleted: true };
  }

  public async searchEntities(params: SearchEntitiesParams): Promise<{
    records: Entity[];
    total: number;
    inspect: InspectQuery;
  }> {
    const { page, perPage, sortField, sortOrder, filterQuery, entityTypes } = params;

    const index = entityTypes.map((type) => getEntitiesIndexName(type, this.options.namespace));
    const from = (page - 1) * perPage;
    const sort = sortField ? [{ [sortField]: sortOrder }] : undefined;
    const query = filterQuery ? JSON.parse(filterQuery) : undefined;

    const response = await this.options.esClient.search<Entity>({
      index,
      query,
      size: Math.min(perPage, MAX_SEARCH_RESPONSE_SIZE),
      from,
      sort,
      ignore_unavailable: true,
    });
    const { hits } = response;

    const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;

    const records = hits.hits.map((hit) => hit._source as Entity);

    const inspect: InspectQuery = {
      dsl: [JSON.stringify({ index, body: query }, null, 2)],
      response: [JSON.stringify(response, null, 2)],
    };

    return { records, total, inspect };
  }
}
