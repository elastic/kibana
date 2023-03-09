/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { debug } from '../../common/debug_log';
import { Asset, AssetFilters } from '../../common/types_api';
import { ASSETS_INDEX_PREFIX } from '../constants';
import { ElasticsearchAccessorOptions } from '../types';

interface GetAssetsOptions extends ElasticsearchAccessorOptions {
  size?: number;
  filters?: AssetFilters;
  from?: string;
  to?: string;
}

export async function getAssets({
  esClient,
  size = 100,
  filters = {},
}: GetAssetsOptions): Promise<Asset[]> {
  const { from = 'now-24h', to = 'now' } = filters;
  const dsl: SearchRequest = {
    index: ASSETS_INDEX_PREFIX + '*',
    size,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
      },
    },
    collapse: {
      field: 'asset.ean',
    },
    sort: {
      '@timestamp': {
        order: 'desc',
      },
    },
  };

  if (filters && Object.keys(filters).length > 0) {
    const musts: QueryDslQueryContainer[] = [];

    if (typeof filters.collectionVersion === 'number') {
      musts.push({
        term: {
          ['asset.collection_version']: filters.collectionVersion,
        },
      });
    }

    if (filters.type) {
      musts.push({
        terms: {
          ['asset.type']: Array.isArray(filters.type) ? filters.type : [filters.type],
        },
      });
    }

    if (filters.kind) {
      musts.push({
        term: {
          ['asset.kind']: filters.kind,
        },
      });
    }

    if (filters.ean) {
      musts.push({
        term: {
          ['asset.ean']: filters.ean,
        },
      });
    }

    if (filters.id) {
      musts.push({
        term: {
          ['asset.id']: filters.id,
        },
      });
    }

    if (filters.typeLike) {
      musts.push({
        wildcard: {
          ['asset.type']: filters.typeLike,
        },
      });
    }

    if (filters.eanLike) {
      musts.push({
        wildcard: {
          ['asset.ean']: filters.eanLike,
        },
      });
    }

    if (musts.length > 0) {
      dsl.query = dsl.query || {};
      dsl.query.bool = dsl.query.bool || {};
      dsl.query.bool.must = musts;
    }
  }

  debug('Performing Asset Query', '\n\n', JSON.stringify(dsl, null, 2));

  const response = await esClient.search<{}>(dsl);
  return response.hits.hits.map((hit) => hit._source as Asset);
}
