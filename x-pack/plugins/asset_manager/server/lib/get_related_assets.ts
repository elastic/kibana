/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { debug } from '../../common/debug_log';
import { Asset, AssetFilters, Relation } from '../../common/types_api';
import { ASSETS_INDEX_PREFIX } from '../constants';
import { ElasticsearchAccessorOptions } from '../types';

interface GetRelatedAssetsOptions extends ElasticsearchAccessorOptions {
  size?: number;
  filters?: AssetFilters;
  relation: Relation;
}

export async function getRelatedAssets({
  esClient,
  size = 100,
  filters = {},
  relation,
}: GetRelatedAssetsOptions): Promise<Asset[]> {
  // Maybe it makes the most sense to validate the filters here?

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

    // How to enforce type and size limits when you sometimes need to skip a level to reach relevant information in the level after?

    if (relation === 'ancestors') {
      musts.push({
        terms: {
          ['asset.children']: [filters.ean],
        },
      });
    } else if (relation === 'descendants') {
      musts.push({
        terms: {
          ['asset.parents']: [filters.ean],
        },
      });
    } else if (relation === 'references') {
      musts.push({
        terms: {
          ['asset.references']: [filters.ean],
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
