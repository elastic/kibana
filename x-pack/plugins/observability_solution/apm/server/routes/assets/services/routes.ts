/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import * as t from 'io-ts';
import { createAssetsESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getServicesFromAssets } from './get_services_from_assets';
import { kueryRt, rangeRt } from '../../default_api_types';

interface SignalTypes {
  'asset.trace'?: boolean;
  'asset.logs'?: boolean;
}

type ServiceItem = {
  environment: string;
  name: string;
  node: {
    name: string;
  };
  signalTypes: SignalTypes[];
  identifyingMetadata: string[];
};
export interface ServicesItemsResponse {
  services: ServiceItem[];
}

const servicesAssetsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assets/services',
  params: t.type({
    query: t.intersection([kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<ServicesItemsResponse> {
    const { context, params, request } = resources;
    const coreContext = await context.core;

    const assetsESClient = await createAssetsESClient({
      request,
      esClient: coreContext.elasticsearch.client.asCurrentUser,
    });

    const { start, end, kuery } = params.query;

    const services = await getServicesFromAssets({ assetsESClient, start, end, kuery });
    return { services };
  },
});

export const servicesAssetsRoutesRepository = {
  ...servicesAssetsRoute,
};
