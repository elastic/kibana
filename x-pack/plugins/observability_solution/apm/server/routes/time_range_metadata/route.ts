/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { TimeRangeMetadata } from '../../../common/time_range_metadata';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getIsUsingServiceDestinationMetrics } from '../../lib/helpers/spans/get_is_using_service_destination_metrics';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { kueryRt, rangeRt } from '../default_api_types';
import { getApmDataAccessServices } from '../../lib/helpers/get_apm_data_access_services';

export const timeRangeMetadataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/time_range_metadata',
  params: t.type({
    query: t.intersection([
      t.type({
        useSpanName: toBooleanRt,
        enableServiceTransactionMetrics: toBooleanRt,
        enableContinuousRollups: toBooleanRt,
      }),
      kueryRt,
      rangeRt,
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<TimeRangeMetadata> => {
    const apmEventClient = await getApmEventClient(resources);
    const apmDataAccessServices = await getApmDataAccessServices({ apmEventClient, ...resources });

    const {
      query: {
        useSpanName,
        start,
        end,
        kuery,
        enableServiceTransactionMetrics,
        enableContinuousRollups,
      },
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
        enableServiceTransactionMetrics,
        enableContinuousRollups,
      }),
    ]);

    return {
      isUsingServiceDestinationMetrics,
      sources,
    };
  },
});
