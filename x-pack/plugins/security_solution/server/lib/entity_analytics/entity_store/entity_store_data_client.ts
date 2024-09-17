/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';

import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { createQueryFilterClauses } from '../../../utils/build_query';
import type {
  HostEntity,
  UserEntity,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type {
  InitEntityStoreRequestBody,
  InitEntityStoreResponse,
} from '../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import type {
  EngineDescriptor,
  EntityType,
  InspectQuery,
} from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { entityEngineDescriptorTypeName } from './saved_object';
import { EngineDescriptorClient } from './saved_object/engine_descriptor';
import { getEntitiesIndexName, getEntityDefinition } from './utils/utils';
import { ENGINE_STATUS } from './constants';

interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  entityClient: EntityClient;
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

const MAX_SEARCH_RESPONSE_SIZE = 10_000;

export class EntityStoreDataClient {
  private engineClient: EngineDescriptorClient;
  constructor(private readonly options: EntityStoreClientOpts) {
    this.engineClient = new EngineDescriptorClient(options.soClient);
  }

  public async init(
    entityType: EntityType,
    { indexPattern = '', filter = '' }: InitEntityStoreRequestBody
  ): Promise<InitEntityStoreResponse> {
    const definition = getEntityDefinition(entityType);

    this.options.logger.info(`Initializing entity store for ${entityType}`);

    const descriptor = await this.engineClient.init(entityType, definition, filter);
    await this.options.entityClient.createEntityDefinition({
      definition: {
        ...definition,
        filter,
        indexPatterns: indexPattern
          ? [...definition.indexPatterns, ...indexPattern.split(',')]
          : definition.indexPatterns,
      },
    });
    const updated = await this.engineClient.update(definition.id, ENGINE_STATUS.STARTED);

    return { ...descriptor, ...updated };
  }

  public async start(entityType: EntityType) {
    const definition = getEntityDefinition(entityType);

    const descriptor = await this.engineClient.get(entityType);

    if (descriptor.status !== ENGINE_STATUS.STOPPED) {
      throw new Error(
        `Cannot start Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.options.logger.info(`Starting entity store for ${entityType}`);
    await this.options.entityClient.startEntityDefinition(definition);

    return this.engineClient.update(definition.id, ENGINE_STATUS.STARTED);
  }

  public async stop(entityType: EntityType) {
    const definition = getEntityDefinition(entityType);

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
    return this.options.soClient
      .find<EngineDescriptor>({
        type: entityEngineDescriptorTypeName,
      })
      .then(({ saved_objects: engines }) => ({
        engines: engines.map((engine) => engine.attributes),
        count: engines.length,
      }));
  }

  public async delete(entityType: EntityType, deleteData: boolean) {
    const { id } = getEntityDefinition(entityType);

    this.options.logger.info(`Deleting entity store for ${entityType}`);

    await this.options.entityClient.deleteEntityDefinition({ id, deleteData });
    await this.engineClient.delete(id);

    return { deleted: true };
  }

  public async searchEntities(params: SearchEntitiesParams): Promise<{
    records: Array<UserEntity | HostEntity>;
    total: number;
    inspect: InspectQuery;
  }> {
    const { page, perPage, sortField, sortOrder, filterQuery, entityTypes } = params;

    const index = entityTypes.map(getEntitiesIndexName);
    const from = (page - 1) * perPage;
    const sort = sortField ? [{ [sortField]: sortOrder }] : undefined;

    const filter = [...createQueryFilterClauses(filterQuery)];
    const query = {
      bool: {
        filter,
      },
    };

    const response = await this.options.esClient.search<UserEntity | HostEntity>({
      index,
      query,
      size: Math.min(perPage, MAX_SEARCH_RESPONSE_SIZE),
      from,
      sort,
      ignore_unavailable: true,
    });
    const { hits } = response;

    const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;

    const records = hits.hits.map((hit) => hit._source as UserEntity | HostEntity);

    const inspect: InspectQuery = {
      dsl: [JSON.stringify({ index, body: query }, null, 2)],
      response: [JSON.stringify(response, null, 2)],
    };

    return { records, total, inspect };
  }
}
