/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';

import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { EngineDataviewUpdateResult } from '../../../../common/api/entity_analytics/entity_store/engine/apply_dataview_indices.gen';
import type { AppClient } from '../../..';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type {
  InitEntityEngineRequestBody,
  InitEntityEngineResponse,
} from '../../../../common/api/entity_analytics/entity_store/engine/init.gen';

import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { type InspectQuery } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { EngineDescriptorClient } from './saved_object/engine_descriptor';
import {
  buildEntityDefinitionId,
  buildIndexPatterns,
  getEntitiesIndexName,
  getEntityDefinition,
  isPromiseFulfilled,
  isPromiseRejected,
} from './utils/utils';
import { ENGINE_STATUS, MAX_SEARCH_RESPONSE_SIZE } from './constants';
import type { AssetCriticalityEcsMigrationClient } from '../asset_criticality/asset_criticality_migration_client';

interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  entityClient: EntityClient;
  assetCriticalityMigrationClient: AssetCriticalityEcsMigrationClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  dataViewsService: DataViewsService;
  appClient: AppClient;
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
    { indexPattern = '', filter = '' }: InitEntityEngineRequestBody
  ): Promise<InitEntityEngineResponse> {
    const { entityClient, assetCriticalityMigrationClient, logger } = this.options;
    const requiresMigration = await assetCriticalityMigrationClient.isEcsDataMigrationRequired();

    if (requiresMigration) {
      throw new Error(
        'Asset criticality data migration is required before initializing entity store. If this error persists, please restart Kibana.'
      );
    }

    const definition = await getEntityDefinition(
      entityType,
      this.options.namespace,
      this.options.dataViewsService,
      this.options.appClient
    );

    logger.info(
      `In namespace ${this.options.namespace}: Initializing entity store for ${entityType}`
    );

    const descriptor = await this.engineClient.init(entityType, definition, filter);
    await entityClient.createEntityDefinition({
      definition: {
        ...definition,
        filter,
        indexPatterns: indexPattern
          ? [...definition.indexPatterns, ...indexPattern.split(',')]
          : definition.indexPatterns,
      },
    });
    const updated = await this.engineClient.update(definition.id, {
      status: ENGINE_STATUS.STARTED,
    });

    return { ...descriptor, ...updated };
  }

  public async start(entityType: EntityType) {
    const definition = await getEntityDefinition(
      entityType,
      this.options.namespace,
      this.options.dataViewsService,
      this.options.appClient
    );

    const descriptor = await this.engineClient.get(entityType);

    if (descriptor.status !== ENGINE_STATUS.STOPPED) {
      throw new Error(
        `In namespace ${this.options.namespace}: Cannot start Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.options.logger.info(
      `In namespace ${this.options.namespace}: Starting entity store for ${entityType}`
    );
    await this.options.entityClient.startEntityDefinition(definition);

    return this.engineClient.update(definition.id, { status: ENGINE_STATUS.STARTED });
  }

  public async stop(entityType: EntityType) {
    const definition = await getEntityDefinition(
      entityType,
      this.options.namespace,
      this.options.dataViewsService,
      this.options.appClient
    );
    const descriptor = await this.engineClient.get(entityType);

    if (descriptor.status !== ENGINE_STATUS.STARTED) {
      throw new Error(
        `In namespace ${this.options.namespace}: Cannot stop Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.options.logger.info(
      `In namespace ${this.options.namespace}: Stopping entity store for ${entityType}`
    );
    await this.options.entityClient.stopEntityDefinition(definition);

    return this.engineClient.update(definition.id, { status: ENGINE_STATUS.STOPPED });
  }

  public async get(entityType: EntityType) {
    return this.engineClient.get(entityType);
  }

  public async list() {
    return this.engineClient.list();
  }

  public async delete(entityType: EntityType, deleteData: boolean) {
    const id = buildEntityDefinitionId(entityType, this.options.namespace);

    this.options.logger.info(
      `In namespace ${this.options.namespace}: Deleting entity store for ${entityType}`
    );

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

  public async applyDataViewIndices(): Promise<{
    successes: EngineDataviewUpdateResult[];
    errors: Error[];
  }> {
    const { entityClient, logger } = this.options;
    logger.info(
      `In namespace ${this.options.namespace}: Applying data view indices to the entity store`
    );

    const { engines } = await this.engineClient.list();

    const updateDefinitionPromises: Array<Promise<EngineDataviewUpdateResult>> = await engines.map(
      async (engine) => {
        const id = buildEntityDefinitionId(engine.type, this.options.namespace);
        const originalStatus = engine.status;

        if (
          originalStatus === ENGINE_STATUS.INSTALLING ||
          originalStatus === ENGINE_STATUS.UPDATING
        ) {
          throw new Error(
            `Error updating entity store: There is an changes already in progress for engine ${id}`
          );
        }

        const indexPatterns = await buildIndexPatterns(
          this.options.namespace,
          this.options.appClient,
          this.options.dataViewsService
        );
        const indexPattern = indexPatterns.join(',');

        // Skip update if index patterns are the same
        if (engine.indexPattern === indexPattern) {
          return { id, changes: {} };
        }

        // Update savedObject status
        await this.engineClient.update(id, {
          status: ENGINE_STATUS.UPDATING,
        });

        try {
          const { definitions } = await entityClient.getEntityDefinitions({
            perPage: 1,
            includeState: false,
            id,
          });

          // Aborts because the definition for the current type is not installed
          if (definitions.length === 0) {
            throw new Error(`Unable to find entity definition with [${id}]`);
          }
          const [definition] = definitions;

          // Update entity manager definition
          await entityClient.updateInEntityDefinition({
            id,
            definitionUpdate: {
              ...definition,
              indexPatterns,
            },
            installOnly: originalStatus === ENGINE_STATUS.STOPPED,
          });

          // Restore the savedObject status and set the new index pattern
          await this.engineClient.update(definition.id, {
            status: originalStatus,
            indexPattern,
          });

          return { id, changes: { indexPattern } };
        } catch (error) {
          // Rollback the engine initial status when the update fails
          await this.engineClient.update(id, {
            status: originalStatus,
          });

          throw error;
        }
      }
    );

    const updatedDefinitions = await Promise.allSettled(updateDefinitionPromises);

    const updateErrors = updatedDefinitions
      .filter(isPromiseRejected)
      .map((result) => result.reason);

    const updateSuccesses = updatedDefinitions
      .filter(isPromiseFulfilled<EngineDataviewUpdateResult>)
      .map((result) => result.value);

    return {
      successes: updateSuccesses,
      errors: updateErrors,
    };
  }
}
