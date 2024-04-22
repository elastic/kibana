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
import type {
  EntityStoreEntity,
  NewEntityStoreEntity,
} from '../../../../common/entity_analytics/entity_store/types';
import { getEntityStoreIndex } from '../../../../common/entity_analytics/entity_store';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { entityStoreFieldMap, FIELD_HISTORY_MAX_SIZE } from './constants';
import { startEntityStoreTask } from './tasks';
import { maybeCreateAndStartEntityTransform } from './transform';
import type { EntityAnalyticsConfig } from '../types';

interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

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
      first_seen: entityA.first_seen,
      last_seen: entityB.last_seen,
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
    await createOrUpdateIndex({
      esClient: this.options.esClient,
      logger: this.options.logger,
      options: {
        index: getEntityStoreIndex(this.options.namespace),
        mappings: mappingFromFieldMap(entityStoreFieldMap, true),
      },
    });

    const taskInterval = config.demoMode ? '30s' : '2m';

    await startEntityStoreTask({
      logger: this.options.logger,
      namespace: this.options.namespace,
      taskManager,
      interval: taskInterval,
    });

    const transformInterval = config.demoMode ? '1m' : '15m';

    await maybeCreateAndStartEntityTransform({
      client: this.options.esClient,
      interval: transformInterval,
    });
  }

  public async bulkUpsertEntities({ entities }: { entities: NewEntityStoreEntity[] }) {
    const existingEntitiesByHostName = await this.getExistingEntitiesByHostname(entities);

    const operations: BulkRequest<EntityStoreEntity, NewEntityStoreEntity>['operations'] = [];

    // wanted to use flatMap here but the types are not working as expected
    entities.forEach((entity) => {
      const existingEntity = existingEntitiesByHostName[entity.host.name];
      if (existingEntity?._source) {
        const mergedEntity = EntityStoreDataClient.mergeEntities(existingEntity._source, entity);

        if (entitiesAreMeaningfullyDifferent(mergedEntity, existingEntity._source)) {
          operations.push(
            ...[
              {
                update: {
                  _id: existingEntity._id,
                  _index: getEntityStoreIndex(this.options.namespace),
                  if_seq_no: existingEntity._seq_no,
                  if_primary_term: existingEntity._primary_term,
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

    const result = await this.options.esClient.bulk({
      operations,
    });

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
