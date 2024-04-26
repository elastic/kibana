/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { ASSET_TYPE, FIRST_SEEN, LAST_SEEN } from '../../../../common/es_fields/assets';
import { AssetsESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { withApmSpan } from '../../../utils/with_apm_span';

export const MAX_NUMBER_OF_SERVICES = 1_000;

export async function getServicesFromAssets({
  assetsESClient,
  start,
  end,
  kuery,
}: {
  assetsESClient: AssetsESClient;
  start: number;
  end: number;
  kuery: string;
}) {
  return withApmSpan('get_services_from_assets', async () => {
    const response = await assetsESClient.search('get_services_from_assets', {
      body: {
        size: MAX_NUMBER_OF_SERVICES,
        track_total_hits: false,
        query: {
          bool: {
            filter: [...termQuery(ASSET_TYPE, 'service'), ...kqlQuery(kuery)],
            should: [...rangeQuery(start, end, FIRST_SEEN), ...rangeQuery(start, end, LAST_SEEN)],
          },
        },
      },
    });

    const services = response.hits.hits.map((hit) => ({
      ...hit._source?.service,
      signalTypes: hit._source?.asset?.signalTypes,
      identifyingMetadata: hit._source?.asset?.identifying_metadata,
    }));

    return services;
  });
}
