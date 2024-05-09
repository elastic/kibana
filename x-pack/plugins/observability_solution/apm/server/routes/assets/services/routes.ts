/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { createAssetsESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { kueryRt, rangeRt, serviceTransactionDataSourceRt } from '../../default_api_types';
import { getServiceAssets } from './get_service_assets';
import { AssetServicesResponse } from './types';

const servicesAssetsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assets/services',
  params: t.type({
    query: t.intersection([
      kueryRt,
      rangeRt,
      serviceTransactionDataSourceRt,
      t.type({ useDurationSummary: toBooleanRt }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<AssetServicesResponse> {
    const { context, params, request, plugins } = resources;
    const [coreContext, apmEventClient, logsDataAccessStart] = await Promise.all([
      context.core,
      getApmEventClient(resources),
      plugins.logsDataAccess.start(),
    ]);

    const assetsESClient = await createAssetsESClient({
      request,
      esClient: coreContext.elasticsearch.client.asCurrentUser,
    });

    const { start, end, kuery, documentType, rollupInterval, useDurationSummary } = params.query;

    const services = await getServiceAssets({
      assetsESClient,
      start,
      end,
      kuery,
      logger: resources.logger,
      apmEventClient,
      logsDataAccessStart,
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      documentType,
      rollupInterval,
      useDurationSummary,
    });

    return { services };
  },
});

export const servicesAssetsRoutesRepository = {
  ...servicesAssetsRoute,
};
