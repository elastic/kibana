/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { debug } from '../../common/debug_log';
import { Asset, AssetType, Relation, RelationField } from '../../common/types_api';
import { ASSETS_INDEX_PREFIX } from '../constants';
import { ElasticsearchAccessorOptions } from '../types';

interface GetRelatedAssetsOptions extends ElasticsearchAccessorOptions {
  size?: number;
  ean: string;
  excludeEans?: string[];
  from?: string;
  to?: string;
  relation: Relation;
  type?: AssetType[];
}

export async function getRelatedAssets({
  esClient,
  size = 100,
  from = 'now-24h',
  to = 'now',
  ean,
  excludeEans,
  relation,
  type,
}: GetRelatedAssetsOptions): Promise<Asset[]> {
  // Maybe it makes the most sense to validate the filters here?
  const relationField = relationToIndirectField(relation);
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

  const musts = [
    {
      terms: {
        [relationField]: [ean],
      },
    },
  ];

  if (type?.length) {
    musts.push({
      terms: {
        ['asset.type']: type,
      },
    });
  }

  dsl.query!.bool!.must = musts;

  if (excludeEans && excludeEans.length) {
    dsl.query!.bool!.must_not = [
      {
        terms: {
          'asset.ean': excludeEans,
        },
      },
    ];
  }

  debug('Performing Asset Query', '\n\n', JSON.stringify(dsl, null, 2));

  const response = await esClient.search<{}>(dsl);
  return response.hits.hits.map((hit) => hit._source as Asset);
}

function relationToIndirectField(relation: Relation): RelationField {
  if (relation === 'ancestors') {
    return 'asset.children';
  } else if (relation === 'descendants') {
    return 'asset.parents';
  } else {
    return 'asset.references';
  }
}
