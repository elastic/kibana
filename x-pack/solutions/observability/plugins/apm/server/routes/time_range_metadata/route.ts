/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { routeDefinitions, type TimeRangeMetadataResponse } from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getIsUsingServiceDestinationMetrics } from '../../lib/helpers/spans/get_is_using_service_destination_metrics';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmDataAccessServices } from '../../lib/helpers/get_apm_data_access_services';

export const timeRangeMetadataRoute = createApmServerRoute({
  endpoint: routeDefinitions.timeRangeMetadata.timeRangeMetadata.endpoint,
  params: routeDefinitions.timeRangeMetadata.timeRangeMetadata.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TimeRangeMetadataResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const apmDataAccessServices = await getApmDataAccessServices({ apmEventClient, ...resources });

    const {
      query: { useSpanName, start, end, kuery },
    } = resources.params;

    const [isUsingServiceDestinationMetrics, sources] = await Promise.all([
      getIsUsingServiceDestinationMetrics({
        apmEventClient,
        useSpanName,
        start,
        end,
        kuery,
      }),
      apmDataAccessServices.getDocumentSources({
        start,
        end,
        kuery,
      }),
    ]);

    return {
      isUsingServiceDestinationMetrics,
      sources,
    };
  },
});
