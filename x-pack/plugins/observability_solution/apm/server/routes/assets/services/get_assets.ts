/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { WrappedElasticsearchClientError } from '@kbn/observability-plugin/server';
import { termQuery, kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ASSET_TYPE, FIRST_SEEN, LAST_SEEN } from '../../../../common/es_fields/assets';
import { AssetsESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { withApmSpan } from '../../../utils/with_apm_span';
import { ServiceAssetDocument } from './types';

export const MAX_NUMBER_OF_SERVICES = 1_000;

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
  logger,
}: {
  assetsESClient: AssetsESClient;
  start: number;
  end: number;
  kuery: string;
  assetType: AssetType;
  logger: Logger;
}) {
  return withApmSpan('get_assets', async () => {
    try {
      const response = await assetsESClient.search(`get_${assetType}_from_assets`, {
        body: {
          size: MAX_NUMBER_OF_SERVICES,
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

      const services = response.hits.hits.map((hit) => {
        const serviceAsset = hit._source as ServiceAssetDocument;

        return {
          asset: {
            signalTypes: serviceAsset.asset.signalTypes,
            identifyingMetadata: serviceAsset.asset.identifying_metadata,
          },
          service: {
            name: serviceAsset.service.name,
            environment: serviceAsset.service.environment,
          },
        };
      });
      return services;
    } catch (error) {
      // If the index does not exist, handle it gracefully
      if (
        error instanceof WrappedElasticsearchClientError &&
        error.originalError instanceof errors.ResponseError
      ) {
        const type = error.originalError.body.error.type;

        if (type === 'index_not_found_exception') {
          logger.error(`Asset index does not exist. Unable to fetch services.`);
          return [];
        }
      }
    }
  });
}
