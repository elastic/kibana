/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { debug } from '../../common/debug_log';
import { Asset, AssetFilters } from '../../common/types_api';
import { ASSETS_INDEX_PREFIX } from '../constants';
import { ElasticsearchAccessorOptions } from '../types';
import { isStringOrNonEmptyArray } from './utils';

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
  // Maybe it makes the most sense to validate the filters here?
  debug('Get Assets Filters:', JSON.stringify(filters));

  const { from = 'now-24h', to = 'now' } = filters;
  const must: QueryDslQueryContainer[] = [];

  if (filters && Object.keys(filters).length > 0) {
    if (typeof filters.collectionVersion === 'number') {
      must.push({
        term: {
          ['asset.collection_version']: filters.collectionVersion,
        },
      });
    }

    if (isStringOrNonEmptyArray(filters.type)) {
      must.push({
        terms: {
          ['asset.type']: Array.isArray(filters.type) ? filters.type : [filters.type],
        },
      });
    }

    if (isStringOrNonEmptyArray(filters.kind)) {
      must.push({
        terms: {
          ['asset.kind']: Array.isArray(filters.kind) ? filters.kind : [filters.kind],
        },
      });
    }

    if (isStringOrNonEmptyArray(filters.ean)) {
      must.push({
        terms: {
          ['asset.ean']: Array.isArray(filters.ean) ? filters.ean : [filters.ean],
        },
      });
    }

    if (filters.id) {
      must.push({
        term: {
          ['asset.id']: filters.id,
        },
      });
    }

    if (filters.typeLike) {
      must.push({
        wildcard: {
          ['asset.type']: filters.typeLike,
        },
      });
    }

    if (filters.kindLike) {
      must.push({
        wildcard: {
          ['asset.kind']: filters.kindLike,
        },
      });
    }

    if (filters.eanLike) {
      must.push({
        wildcard: {
          ['asset.ean']: filters.eanLike,
        },
      });
    }
  }

  const dsl = {
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
        must,
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

  debug('Performing Get Assets Query', '\n\n', JSON.stringify(dsl, null, 2));

  const response = await esClient.search<Asset>(dsl);
  return response.hits.hits.map((hit) => hit._source).filter((asset): asset is Asset => !!asset);
}
