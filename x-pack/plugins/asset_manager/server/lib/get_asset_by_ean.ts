/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { debug } from '../../common/debug_log';
import { Asset, AssetFilters } from '../../common/types_api';
import { ASSETS_INDEX } from '../constants';
import { ElasticsearchAccessorOptions } from '../types';

interface GetAssetsOptions extends ElasticsearchAccessorOptions {
  ean: string;
  from?: AssetFilters['from'];
  to?: AssetFilters['to'];
}

export async function getAssetByEan({
  esClient,
  ean,
  from = 'now-24h',
  to = 'now',
}: GetAssetsOptions): Promise<Asset[]> {
  const dsl: SearchRequest = {
    index: ASSETS_INDEX,
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
        must: [
          {
            term: {
              'asset.ean': ean,
            },
          },
        ],
      },
    },
  };

  dsl.collapse = {
    field: 'asset.ean',
  };

  dsl.sort = {
    '@timestamp': {
      order: 'desc',
    },
  };

  debug('Performing Asset Query', '\n\n', JSON.stringify(dsl, null, 2));

  const response = await esClient.search<{}>(dsl);
  return response.hits.hits.map((hit) => hit._source as Asset);
}
