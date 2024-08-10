/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESFilter } from '@kbn/es-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { createHash } from 'crypto';
import type {
  EntityRelationRecord,
  RelatedEntityRelation,
  RelatedEntityType,
} from '../../../../../common/api/entity_analytics/entity_store/relations/common.gen';
import { getEntityRelationsIndex } from '../../../../../common/entity_analytics/entity_store/indices';
import { entityRelationsFieldMap } from './constants';

interface EntityStoreClientOpts {
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  esClient: ElasticsearchClient;
  namespace: string;
}

export class EntityRelationsDataClient {
  constructor(private readonly options: EntityStoreClientOpts) {}

  public async create(record: EntityRelationRecord, refresh = 'wait_for' as const) {
    const indexExist = await this.doesIndexExist();

    if (!indexExist) {
      await this.options.esClient.indices.create({
        index: this.getIndex(),
        mappings: mappingFromFieldMap(entityRelationsFieldMap, 'strict'),
      });
    }

    const recordHash = createHash('sha256')
      .update([record.entity_type, record.entity.name, record.related_entity.id].join('-'))
      .digest('hex');
    await this.options.esClient.index({
      id: recordHash,
      index: this.getIndex(),
      refresh: refresh ?? false,
      body: record,
    });
  }

  public async search({
    relation,
    entityType,
    entityName,
    size = 100,
  }: {
    relation?: RelatedEntityRelation;
    entityType: RelatedEntityType;
    entityName: string;
    size?: number;
  }): Promise<EntityRelationRecord[]> {
    const filter: QueryDslQueryContainer[] = [
      {
        term: {
          'entity.name': entityName,
        },
      },
      {
        term: {
          entity_type: entityType,
        },
      },
    ];

    if (relation) {
      filter.push({
        term: {
          relation,
        },
      });
    }
    const query: ESFilter = {
      bool: {
        filter,
      },
    };

    const response = await this.options.esClient.search<EntityRelationRecord>({
      index: this.getIndex(),
      ignore_unavailable: true,
      size,
      query,
    });

    const docs = response.hits.hits.map((hit) => (hit._source ? [hit._source] : [])).flat();

    return docs;
  }

  private async doesIndexExist() {
    try {
      const result = await this.options.esClient.indices.exists({
        index: this.getIndex(),
      });

      return result;
    } catch (e) {
      return false;
    }
  }

  private getIndex() {
    return getEntityRelationsIndex(this.options.namespace);
  }
}
