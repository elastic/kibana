/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type {
  BulkRequest,
  BulkResponseItem,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import _ from 'lodash';
import jsonDiff from 'json-diff';
import flat from 'flat';
import type { IdField } from '../../../../common/api/entity_analytics';
import type {
  EntityStoreEntity,
  NewEntityStoreEntity,
  EntityHistoryDocument,
} from '../../../../common/entity_analytics/entity_store/types';
import {
  getEntityStoreIndex,
  getEntityStoreHistoryIndex,
} from '../../../../common/entity_analytics/entity_store';
import { createOrUpdateIndex, createOrUpdateDatastream } from '../utils/create_or_update_index';
import {
  entityStoreFieldMap,
  entityHistoryFieldMap,
  FIELD_HISTORY_MAX_SIZE,
  ENTITY_HISTORY_INDEX_PATTERN,
  ENTITY_HISTORY_INDEX_TEMPLATE_NAME,
} from './constants';
import { startEntityStoreTask } from './tasks';
import { maybeCreateAndStartEntityTransform } from './transform';
import type { EntityAnalyticsConfig } from '../types';
interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

function getChangedFieldsPathsFromDiff(
  obj: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  basePath: string = '',
  pathsIn: string[] = []
) {
  const paths = pathsIn;
  for (const key in obj) {
    if (key.endsWith('__deleted')) {
      // do nothing, we don't care about deleted fields as updates are partial
    } else if (key.endsWith('__added')) {
      const realKey = key.slice(0, -7);
      paths.push(`${basePath}${realKey}`);
    } else if (Array.isArray(obj[key])) {
      paths.push(`${basePath}${key}`);
    } else if (obj[key] === undefined) {
      paths.push(`${basePath}${key}`);
    } else if (typeof obj[key] === 'object' && (obj[key].__old || obj[key].__new)) {
      paths.push(`${basePath}${key}`);
    } else {
      getChangedFieldsPathsFromDiff(obj[key], `${basePath}${key}.`, paths);
    }
  }
  return paths;
}

function removeArrayIndexesFromFlatPaths(paths: string[]) {
  return _.uniq(paths.map((path) => path.replace(/\.\d+\./g, '.')));
}

type EntityStoreBulkOperations = BulkRequest<EntityStoreEntity, NewEntityStoreEntity>['operations'];

type EntityHistoryStoreBulkOperations = BulkRequest<
  EntityHistoryDocument,
  EntityHistoryDocument
>['operations'];

export class EntityStoreDataClient {
  constructor(private readonly options: EntityStoreClientOpts) {}
  static mergeEntities(
    entityA: NewEntityStoreEntity | EntityStoreEntity,
    entityB: NewEntityStoreEntity | EntityStoreEntity // takes precedence over entityA
  ): EntityStoreEntity {
    const ipHistory = [
      ...(entityA.host?.ip_history || []),
      ...(entityB.host?.ip_history || []),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const uniqueLimitedIpHistory = _.uniqWith(
      ipHistory,
      (a, b) => a.ip === b.ip && a.timestamp === b.timestamp
    ).slice(0, FIELD_HISTORY_MAX_SIZE);

    return {
      ...entityA,
      ...entityB,
      first_seen: entityA.first_seen || entityB.first_seen,
      last_seen: entityB.last_seen || entityA.last_seen,
      host: {
        ...entityA.host,
        ...entityB.host,
        ip_history: uniqueLimitedIpHistory,
      },
    };
  }
  /**
   * It creates the entity store index or update mappings if index exists
   */
  public async init({
    taskManager,
    config,
  }: {
    taskManager: TaskManagerStartContract;
    config: EntityAnalyticsConfig['entityStore'];
  }) {
    const demoMode = config.demoMode;

    if (demoMode) {
      this.options.logger.warn('Initializing entity store in demo mode');
    }

    // entities index
    await createOrUpdateIndex({
      esClient: this.options.esClient,
      logger: this.options.logger,
      options: {
        index: getEntityStoreIndex(this.options.namespace),
        mappings: mappingFromFieldMap(entityStoreFieldMap, true),
      },
    });

    // entity history datastream
    await createOrUpdateDatastream({
      esClient: this.options.esClient,
      logger: this.options.logger,
      name: getEntityStoreHistoryIndex(this.options.namespace),
      template: {
        name: ENTITY_HISTORY_INDEX_TEMPLATE_NAME,
        index_patterns: [ENTITY_HISTORY_INDEX_PATTERN],
        data_stream: {},
        template: {
          mappings: mappingFromFieldMap(entityHistoryFieldMap, true),
        },
      },
    });

    const taskInterval = demoMode ? '30s' : '2m';

    await startEntityStoreTask({
      logger: this.options.logger,
      namespace: this.options.namespace,
      taskManager,
      interval: taskInterval,
    });

    const transformInterval = demoMode ? '1m' : '15m';

    await maybeCreateAndStartEntityTransform({
      client: this.options.esClient,
      interval: transformInterval,
    });
  }

  public async bulkUpsertEntities({ entities }: { entities: NewEntityStoreEntity[] }) {
    const existingEntitiesByHostName = await this.getExistingEntitiesByHostname(entities);

    const operations: EntityStoreBulkOperations = [];
    const historyOperations: EntityHistoryStoreBulkOperations = [];
    entities.forEach((entity) => {
      const existingEntityDoc = existingEntitiesByHostName[entity.host.name];
      const existingEntity = existingEntityDoc?._source;

      let mergedEntity;

      if (existingEntity) {
        mergedEntity = EntityStoreDataClient.mergeEntities(existingEntity, entity);
      }

      const entityHistoryOperations = this.getEntityHistoryOperations(
        mergedEntity || entity,
        existingEntity
      );

      if (entityHistoryOperations) {
        historyOperations.push(...entityHistoryOperations);
      }

      if (mergedEntity && existingEntity) {
        if (entitiesAreMeaningfullyDifferent(mergedEntity, existingEntity)) {
          operations.push(
            ...[
              {
                update: {
                  _id: existingEntityDoc._id,
                  _index: getEntityStoreIndex(this.options.namespace),
                  if_seq_no: existingEntityDoc._seq_no,
                  if_primary_term: existingEntityDoc._primary_term,
                },
              },
              { doc: mergedEntity },
            ]
          );
        } else {
          this.options.logger.info(
            `Entity ${entity.host.name} has not changed, skipping update operation`
          );
        }
      } else {
        operations.push(
          ...[
            {
              create: {
                _index: getEntityStoreIndex(this.options.namespace),
              },
            },
            entity,
          ]
        );
      }
    });

    if (operations.length === 0) {
      this.options.logger.info('No entity updates to apply');
      return {
        errors: [],
        created: 0,
        updated: 0,
      };
    }

    // maybe we dont want history to block?
    const [result, historyResult] = await Promise.all([
      this.options.esClient.bulk<EntityStoreEntity, NewEntityStoreEntity>({
        body: operations,
      }),
      this.options.esClient.bulk<EntityHistoryDocument>({
        body: historyOperations,
      }),
    ]);

    this.options.logger.debug(
      `Entity store hisotry bulk upsert result: ${JSON.stringify(historyResult)}`
    );

    return {
      errors: result.errors
        ? result.items
            .map((item) => item.create?.error?.reason || item.update?.error?.reason)
            .filter((error): error is string => !!error)
        : [],
      created: result.items.filter((item) => wasSuccessfulOp(item.create)).length,
      updated: result.items.filter((item) => wasSuccessfulOp(item.update)).length,
    };
  }

  public async getEntityHistory({
    idField,
    idValue,
  }: {
    idField: IdField;
    idValue: string;
  }): Promise<{ history: EntityHistoryDocument[] }> {
    const res = await this.options.esClient.search<EntityHistoryDocument>({
      index: getEntityStoreHistoryIndex(this.options.namespace),
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  [`entity.${idField}`]: idValue,
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
      },
    });

    return {
      // @ts-expect-error _source is optional
      history: res.hits.hits.map((hit) => hit._source),
    };
  }

  private createEntityHistoryDocument(
    entity: EntityStoreEntity,
    previousEntity?: EntityStoreEntity
  ): EntityHistoryDocument {
    if (!previousEntity) {
      return {
        '@timestamp': entity['@timestamp'],
        entity,
        created: true,
      };
    }

    const diff = jsonDiff.diff(previousEntity, entity);
    // diff only gives us partial paths, e.g if a whole object is replaced, we only get the top level key
    const changedFields = getChangedFieldsPathsFromDiff(diff);
    const previousValues = _.pick(previousEntity, changedFields);
    const values = _.pick(entity, changedFields);
    // now we can use the previous values to get the full paths
    const allFieldsChanged = removeArrayIndexesFromFlatPaths(Object.keys(flat(values)));
    return {
      '@timestamp': entity['@timestamp'],
      entity,
      fields_changed: allFieldsChanged,
      previous_values: previousValues,
    };
  }

  private getEntityHistoryOperations(
    entity: EntityStoreEntity,
    previousEntity?: EntityStoreEntity
  ): EntityHistoryStoreBulkOperations {
    const document = this.createEntityHistoryDocument(entity, previousEntity);

    return [
      {
        create: {
          _index: getEntityStoreHistoryIndex(this.options.namespace),
        },
      },
      document,
    ];
  }

  private async getExistingEntitiesByHostname(
    entities: NewEntityStoreEntity[]
  ): Promise<Record<string, SearchHit<EntityStoreEntity>>> {
    if (entities.length === 0) {
      return {};
    }
    try {
      const existingEntities = await this.options.esClient.search<EntityStoreEntity>({
        index: getEntityStoreIndex(this.options.namespace),
        body: {
          query: {
            terms: {
              'host.name': entities.map((entity) => entity.host.name),
            },
          },
        },
      });

      const existingEntitiesByHostName = existingEntities.hits.hits.reduce((acc, hit) => {
        if (hit._source?.host.name) {
          acc[hit._source.host.name] = hit;
        }
        return acc;
      }, {} as Record<string, SearchHit<EntityStoreEntity>>);

      return existingEntitiesByHostName;
    } catch (e) {
      this.options.logger.error(`Error getting existing entities by hostname: ${e}`);
      throw e;
    }
  }
}

const wasSuccessfulOp = (op?: BulkResponseItem) => op?.status === 201 || op?.status === 200;

function entitiesAreMeaningfullyDifferent(entityA: EntityStoreEntity, entityB: EntityStoreEntity) {
  const getCoreEntityFields = (entity: EntityStoreEntity) => _.omit(entity, ['@timestamp']);

  return !_.isEqual(getCoreEntityFields(entityA), getCoreEntityFields(entityB));
}
