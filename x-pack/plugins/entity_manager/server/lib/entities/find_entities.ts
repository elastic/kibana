/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryDslQueryContainer,
  SearchRequest,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import {
  entitiesIndexPattern,
  ENTITY_SCHEMA_VERSION_V1,
  EntityLatestDoc,
} from '@kbn/entities-schema';
import { ElasticsearchClient } from '@kbn/core/server';
import { last } from 'lodash';
import rison from '@kbn/rison';
import { getElasticsearchQueryOrThrow } from './helpers/get_elasticsearch_query_or_throw';

export async function findEntities(
  esClient: ElasticsearchClient,
  perPage: number,
  query?: string,
  searchAfter?: Array<string | number>,
  sortObj?: { field: string; direction: 'asc' | 'desc' }
) {
  const filter: QueryDslQueryContainer[] = [];
  if (query) {
    filter.push(getElasticsearchQueryOrThrow(query));
  }

  const sortField = sortObj?.field ?? 'entity.displayName.keyword';
  const sortDirection = sortObj?.direction ?? 'asc';

  const sort =
    sortField === 'entity.displayName.keyword'
      ? [
          {
            [sortField]: sortDirection,
          },
        ]
      : [
          {
            [sortField]: sortDirection,
          },
          {
            ['entity.displayName.keyword']: sortDirection,
          },
        ];

  const params: SearchRequest = {
    index: entitiesIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: 'latest',
      definitionId: '*',
    }),
    allow_no_indices: true,
    ignore_unavailable: true,
    track_total_hits: true,
    size: perPage,
    query: {
      bool: {
        filter,
      },
    },
    sort,
  };

  if (searchAfter) {
    params.search_after = searchAfter;
  }

  const response = await esClient.search<EntityLatestDoc, unknown>(params);
  const lastHit = last(response.hits.hits);
  return {
    entities: response.hits.hits.map((doc) => doc._source),
    total: (response.hits.total as SearchTotalHits).value,
    searchAfter: lastHit != null ? rison.encode(lastHit?.sort) : undefined,
  };
}
