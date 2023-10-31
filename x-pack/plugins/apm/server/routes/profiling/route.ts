/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toNumberRt } from '@kbn/io-ts-utils';
import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import * as t from 'io-ts';
import { profilingUseLegacyFlamegraphAPI } from '@kbn/observability-plugin/common';
import { HOST_NAME } from '../../../common/es_fields/apm';
import { toKueryFilterFormat } from '../../../common/utils/to_kuery_filter_format';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  rangeRt,
  serviceTransactionDataSourceRt,
} from '../default_api_types';
import { getServiceHostNames } from './get_service_host_names';

const profilingFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      environmentRt,
      serviceTransactionDataSourceRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    { flamegraph: BaseFlameGraph; hostNames: string[] } | undefined
  > => {
    const { context, plugins, params } = resources;
    const useLegacyFlamegraphAPI = await (
      await context.core
    ).uiSettings.client.get<boolean>(profilingUseLegacyFlamegraphAPI);

    const [esClient, apmEventClient, profilingDataAccessStart] =
      await Promise.all([
        (await context.core).elasticsearch.client,
        await getApmEventClient(resources),
        await plugins.profilingDataAccess?.start(),
      ]);
    if (profilingDataAccessStart) {
      const { start, end, environment, documentType, rollupInterval } =
        params.query;
      const { serviceName } = params.path;

      const serviceHostNames = await getServiceHostNames({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      if (!serviceHostNames.length) {
        return undefined;
      }

      const flamegraph =
        await profilingDataAccessStart?.services.fetchFlamechartData({
          esClient: esClient.asCurrentUser,
          rangeFromMs: start,
          rangeToMs: end,
          kuery: toKueryFilterFormat(HOST_NAME, serviceHostNames),
          useLegacyFlamegraphAPI,
        });

      return { flamegraph, hostNames: serviceHostNames };
    }

    return undefined;
  },
});

const profilingFunctionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/functions',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      environmentRt,
      serviceTransactionDataSourceRt,
      t.type({ startIndex: toNumberRt, endIndex: toNumberRt }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ functions: TopNFunctions; hostNames: string[] } | undefined> => {
    const { context, plugins, params } = resources;
    const [esClient, apmEventClient, profilingDataAccessStart] =
      await Promise.all([
        (await context.core).elasticsearch.client,
        await getApmEventClient(resources),
        await plugins.profilingDataAccess?.start(),
      ]);
    if (profilingDataAccessStart) {
      const {
        start,
        end,
        environment,
        startIndex,
        endIndex,
        documentType,
        rollupInterval,
      } = params.query;
      const { serviceName } = params.path;

      const serviceHostNames = await getServiceHostNames({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      if (!serviceHostNames.length) {
        return undefined;
      }

      const functions = await profilingDataAccessStart?.services.fetchFunction({
        esClient: esClient.asCurrentUser,
        rangeFromMs: start,
        rangeToMs: end,
        kuery: toKueryFilterFormat(HOST_NAME, serviceHostNames),
        startIndex,
        endIndex,
      });
      return { functions, hostNames: serviceHostNames };
    }

    return undefined;
  },
});

const profilingStatusRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/profiling/status',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ initialized: boolean }> => {
    const { context, plugins, logger } = resources;
    const [esClient, profilingDataAccessStart] = await Promise.all([
      (await context.core).elasticsearch.client,
      await plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      try {
        const response = await profilingDataAccessStart?.services.getStatus({
          esClient,
          soClient: (await context.core).savedObjects.client,
          spaceId: (
            await plugins.spaces?.start()
          )?.spacesService.getSpaceId(resources.request),
        });

        return { initialized: response.has_setup };
      } catch (e) {
        // If any error happens just return as if profiling has not been initialized
        logger.warn('Could not check Universal Profiling status');
      }
    }

    return { initialized: false };
  },
});

export const profilingRouteRepository = {
  ...profilingFlamegraphRoute,
  ...profilingStatusRoute,
  ...profilingFunctionsRoute,
};
