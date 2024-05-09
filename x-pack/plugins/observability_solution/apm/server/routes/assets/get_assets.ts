/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { termQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { ASSET_TYPE, FIRST_SEEN, LAST_SEEN } from '../../../common/es_fields/assets';
import { AssetsESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';

type AssetType = 'service';

export function assetsRangeQuery(start: number, end: number): QueryDslQueryContainer[] {
  return [
    {
      range: {
        [FIRST_SEEN]: {
          gte: start,
        },
      },
    },
    {
      range: {
        [LAST_SEEN]: {
          lte: end,
        },
      },
    },
  ];
}

export async function getAssets({
  assetsESClient,
  start,
  end,
  kuery,
  assetType,
  size,
}: {
  assetsESClient: AssetsESClient;
  start: number;
  end: number;
  kuery: string;
  assetType: AssetType;
  size: number;
}) {
  const response = await assetsESClient.search(`get_${assetType}_from_assets`, {
    body: {
      size,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(ASSET_TYPE, assetType),
            ...kqlQuery(kuery),
            ...assetsRangeQuery(start, end),
          ],
        },
      },
    },
  });

  return response;
}
