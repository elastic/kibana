/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  kueryRt,
  rangeRt,
  serviceTransactionDataSourceRt,
} from '../default_api_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getServiceHostNames } from './get_service_host_names';
import { hostNamesToKuery } from './utils';

const profilingFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      kueryRt,
      environmentRt,
      serviceTransactionDataSourceRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<BaseFlameGraph | undefined> => {
    const { context, plugins, params } = resources;
    const [esClient, apmEventClient, profilingDataAccessStart] =
      await Promise.all([
        (await context.core).elasticsearch.client,
        await getApmEventClient(resources),
        await plugins.profilingDataAccess?.start(),
      ]);
    if (profilingDataAccessStart) {
      const { start, end, kuery, environment, documentType, rollupInterval } =
        params.query;
      const { serviceName } = params.path;

      const serviceHostNames = await getServiceHostNames({
        apmEventClient,
        start,
        end,
        kuery,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      return profilingDataAccessStart?.services.fetchFlamechartData({
        esClient: esClient.asCurrentUser,
        rangeFromMs: start,
        rangeToMs: end,
        kuery: hostNamesToKuery(serviceHostNames),
      });
    }

    return undefined;
  },
});

export const profilingRouteRepository = {
  ...profilingFlamegraphRoute,
};
