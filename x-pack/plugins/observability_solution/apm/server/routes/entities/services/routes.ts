/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { createEntitiesESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import {
  environmentRt,
  kueryRt,
  rangeRt,
  serviceTransactionDataSourceRt,
} from '../../default_api_types';
import { getServiceAssets as getServiceEntities } from './get_service_assets';
import { EntityServicesResponse } from '../../../../common/assets/types';

const servicesEntitiesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/entities/services',
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      serviceTransactionDataSourceRt,
      t.type({ useDurationSummary: toBooleanRt }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<EntityServicesResponse> {
    const { context, params, request, plugins } = resources;
    const [coreContext, apmEventClient, logsDataAccessStart] = await Promise.all([
      context.core,
      getApmEventClient(resources),
      plugins.logsDataAccess.start(),
    ]);

    const assetsESClient = await createEntitiesESClient({
      request,
      esClient: coreContext.elasticsearch.client.asCurrentUser,
    });

    const { start, end, kuery, documentType, rollupInterval, useDurationSummary, environment } =
      params.query;

    const services = await getServiceEntities({
      assetsESClient,
      start,
      end,
      kuery,
      environment,
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

export const servicesEntitiesRoutesRepository = {
  ...servicesEntitiesRoute,
};
