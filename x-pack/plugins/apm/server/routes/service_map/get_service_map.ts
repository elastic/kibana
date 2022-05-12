/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { Setup } from '../../lib/helpers/setup_request';
import {
  DEFAULT_ANOMALIES,
  getServiceAnomalies,
} from './get_service_anomalies';
import { getServiceMapFromTraceIds } from './get_service_map_from_trace_ids';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { transformServiceMapResponses } from './transform_service_map_responses';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';

export interface IEnvOptions {
  setup: Setup;
  serviceNames?: string[];
  environment: string;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  start: number;
  end: number;
}

async function getConnectionData({
  setup,
  serviceNames,
  environment,
  start,
  end,
}: IEnvOptions) {
  return withApmSpan('get_service_map_connections', async () => {
    const { traceIds } = await getTraceSampleIds({
      setup,
      serviceNames,
      environment,
      start,
      end,
    });

    const chunks = chunk(traceIds, setup.config.serviceMapMaxTracesPerRequest);

    const init = {
      connections: [],
      discoveredServices: [],
    };

    if (!traceIds.length) {
      return init;
    }

    const chunkedResponses = await withApmSpan(
      'get_service_paths_from_all_trace_ids',
      () =>
        Promise.all(
          chunks.map((traceIdsChunk) =>
            getServiceMapFromTraceIds({
              setup,
              traceIds: traceIdsChunk,
              start,
              end,
            })
          )
        )
    );

    return chunkedResponses.reduce((prev, current) => {
      return {
        connections: prev.connections.concat(current.connections),
        discoveredServices: prev.discoveredServices.concat(
          current.discoveredServices
        ),
      };
    });
  });
}

async function getServicesData(options: IEnvOptions) {
  const { environment, setup, searchAggregatedTransactions, start, end } =
    options;

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric as const,
        ProcessorEvent.error as const,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...termsQuery(SERVICE_NAME, ...(options.serviceNames ?? [])),
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 500,
          },
          aggs: {
            agent_name: {
              terms: {
                field: AGENT_NAME,
              },
            },
          },
        },
      },
    },
  };

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(
    'get_service_stats_for_service_map',
    params
  );

  return (
    response.aggregations?.services.buckets.map((bucket) => {
      return {
        [SERVICE_NAME]: bucket.key as string,
        [AGENT_NAME]:
          (bucket.agent_name.buckets[0]?.key as string | undefined) || '',
        [SERVICE_ENVIRONMENT]:
          options.environment === ENVIRONMENT_ALL.value
            ? null
            : options.environment,
      };
    }) || []
  );
}

export type ConnectionsResponse = Awaited<ReturnType<typeof getConnectionData>>;
export type ServicesResponse = Awaited<ReturnType<typeof getServicesData>>;

export function getServiceMap(options: IEnvOptions) {
  return withApmSpan('get_service_map', async () => {
    const { logger } = options;
    const anomaliesPromise = getServiceAnomalies(
      options

      // always catch error to avoid breaking service maps if there is a problem with ML
    ).catch((error) => {
      logger.warn(`Unable to retrieve anomalies for service maps.`);
      logger.error(error);
      return DEFAULT_ANOMALIES;
    });

    const [connectionData, servicesData, anomalies] = await Promise.all([
      getConnectionData(options),
      getServicesData(options),
      anomaliesPromise,
    ]);

    return transformServiceMapResponses({
      ...connectionData,
      services: servicesData,
      anomalies,
    });
  });
}
