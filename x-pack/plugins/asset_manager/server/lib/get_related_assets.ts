/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { debug } from '../../common/debug_log';
import { Asset, AssetKind, Relation, RelationField } from '../../common/types_api';
import { ASSETS_INDEX_PREFIX } from '../constants';
import { ElasticsearchAccessorOptions } from '../types';

interface GetRelatedAssetsOptions extends ElasticsearchAccessorOptions {
  size?: number;
  ean: string;
  excludeEans?: string[];
  from?: string;
  to?: string;
  relation: Relation;
  kind?: AssetKind[];
}

export async function getRelatedAssets({
  esClient,
  size = 100,
  from = 'now-24h',
  to = 'now',
  ean,
  excludeEans,
  relation,
  kind,
}: GetRelatedAssetsOptions): Promise<Asset[]> {
  const relationField = relationToIndirectField(relation);
  const must: QueryDslQueryContainer[] = [
    {
      terms: {
        [relationField]: [ean],
      },
    },
  ];

  if (kind?.length) {
    must.push({
      terms: {
        ['asset.kind']: kind,
      },
    });
  }

  const mustNot: QueryDslQueryContainer[] =
    excludeEans && excludeEans.length
      ? [
          {
            terms: {
              'asset.ean': excludeEans,
            },
          },
        ]
      : [];

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
        must,
        must_not: mustNot,
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

  debug('Performing Asset Query', '\n\n', JSON.stringify(dsl, null, 2));

  const response = await esClient.search<Asset>(dsl);
  return response.hits.hits.map((hit) => hit._source).filter((asset): asset is Asset => !!asset);
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
