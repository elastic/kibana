/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { createAssetsESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getServiceAssets } from './get_service_assets';
import { kueryRt, rangeRt } from '../../default_api_types';
import { AssetServicesResponse } from './types';

const servicesAssetsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assets/services',
  params: t.type({
    query: t.intersection([kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<AssetServicesResponse> {
    const { context, params, request } = resources;
    const coreContext = await context.core;

    const assetsESClient = await createAssetsESClient({
      request,
      esClient: coreContext.elasticsearch.client.asCurrentUser,
    });

    const { start, end, kuery } = params.query;

    const services = await getServiceAssets({
      assetsESClient,
      start,
      end,
      kuery,
      logger: resources.logger,
    });
    return { services };
  },
});

export const servicesAssetsRoutesRepository = {
  ...servicesAssetsRoute,
};
