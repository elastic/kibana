/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESFilter } from '@kbn/es-types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';

import type { AuditLogger } from '@kbn/security-plugin-types-server';

import { getEntityStoreIndex } from '../../../../../common/entity_analytics/entity_store/indices';
import type {
  EntityRecord,
  EntityType,
} from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';

interface EntityStoreClientOpts {
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  esClient: ElasticsearchClient;
  namespace: string;
}

interface SearchParams {
  entityType: EntityType;
  entityIds: string[];
  size?: number;
}

export class EntityStoreDataClient {
  constructor(private readonly options: EntityStoreClientOpts) {}

  public async search({
    entityType,
    entityIds,
    size = 100,
  }: SearchParams): Promise<EntityRecord[]> {
    const query: ESFilter = {
      terms: {
        'entity.id': entityIds,
      },
    };

    const response = await this.options.esClient.search<EntityRecord>({
      index: this.getIndex(),
      ignore_unavailable: true,
      size,
      query,
    });

    const docs = response.hits.hits.map((hit) => (hit._source ? [hit._source] : [])).flat();
    return docs;
  }

  private getIndex() {
    return getEntityStoreIndex(this.options.namespace);
  }
}
