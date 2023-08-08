/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import { APMConfig } from '../..';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  DEFAULT_ANOMALIES,
  getServiceAnomalies,
} from './get_service_anomalies';
import { getServiceMapFromTraceIds } from './get_service_map_from_trace_ids';
import { getServiceStats } from './get_service_stats';
import { getTraceSampleIds } from './get_trace_sample_ids';
import {
  TransformServiceMapResponse,
  transformServiceMapResponses,
} from './transform_service_map_responses';

export interface IEnvOptions {
  mlClient?: MlClient;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName?: string;
  environment: string;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroupKuery?: string;
  kuery?: string;
}

async function getConnectionData({
  config,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  serviceGroupKuery,
  kuery,
  logger,
}: IEnvOptions) {
  return withApmSpan('get_service_map_connections', async () => {
    logger.debug('Getting trace sample IDs');
    const { traceIds } = await getTraceSampleIds({
      config,
      apmEventClient,
      serviceName,
      environment,
      start,
      end,
      serviceGroupKuery,
      kuery,
    });

    logger.debug(`Found ${traceIds.length} traces to inspect`);

    const chunks = chunk(traceIds, config.serviceMapMaxTracesPerRequest);

    const init = {
      connections: [],
      discoveredServices: [],
    };

    if (!traceIds.length) {
      return init;
    }

    logger.debug(`Executing scripted metric agg (${chunks.length} chunks)`);

    const chunkedResponses = await withApmSpan(
      'get_service_paths_from_all_trace_ids',
      () =>
        Promise.all(
          chunks.map((traceIdsChunk) =>
            getServiceMapFromTraceIds({
              apmEventClient,
              traceIds: traceIdsChunk,
              start,
              end,
              terminateAfter: config.serviceMapTerminateAfter,
              logger,
            })
          )
        )
    );

    logger.debug('Received chunk responses');

    const mergedResponses = chunkedResponses.reduce((prev, current) => {
      return {
        connections: prev.connections.concat(current.connections),
        discoveredServices: prev.discoveredServices.concat(
          current.discoveredServices
        ),
      };
    });

    logger.debug('Merged responses');

    return mergedResponses;
  });
}

export type ConnectionsResponse = Awaited<ReturnType<typeof getConnectionData>>;
export type ServicesResponse = Awaited<ReturnType<typeof getServiceStats>>;

export function getServiceMap(
  options: IEnvOptions & { maxNumberOfServices: number }
): Promise<TransformServiceMapResponse> {
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
      getServiceStats(options),
      anomaliesPromise,
    ]);

    logger.debug('Received and parsed all responses');

    const transformedResponse = transformServiceMapResponses({
      response: {
        ...connectionData,
        services: servicesData,
        anomalies,
      },
    });

    logger.debug('Transformed service map response');

    return transformedResponse;
  });
}
