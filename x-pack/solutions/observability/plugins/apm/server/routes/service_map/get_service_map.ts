/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import type {
  Connection,
  ExitSpanDestination,
  ServiceMapSpan,
} from '../../../common/service_map/types';
import { getServiceMapNodes, type ServiceMapResponse } from '../../../common/service_map';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';
import { getServiceMapFromTraceIds } from './get_service_map_from_trace_ids';
import { fetchExitSpanSamplesFromTraceIds } from './fetch_exit_span_samples';

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
  useV2?: boolean;
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
  useV2 = false,
}: IEnvOptions): Promise<
  { tracesCount: number } & (
    | { connections: Connection[]; discoveredServices: ExitSpanDestination[] }
    | { spans: ServiceMapSpan[] }
  )
> {
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

    if (useV2) {
      if (traceIds.length === 0) {
        return { spans: [], tracesCount: 0 };
      }

      const spans = await withApmSpan(
        'get_service_map_exit_spans_and_transactions_from_traces',
        () =>
          fetchExitSpanSamplesFromTraceIds({
            apmEventClient,
            traceIds,
            start,
            end,
          })
      );

      return {
        tracesCount: traceIds.length,
        spans,
      };
    }

    if (!traceIds.length) {
      return {
        connections: [],
        discoveredServices: [],
        tracesCount: 0,
      };
    }

    const chunkedResponses = await withApmSpan('get_service_paths_from_all_trace_ids', () => {
      const chunks = chunk(traceIds, config.serviceMapMaxTracesPerRequest);
      logger.debug(`Executing scripted metric agg (${chunks.length} chunks)`);

      return Promise.all(
        chunks.map((traceIdsChunk) =>
          getServiceMapFromTraceIds({
            apmEventClient,
            traceIds: traceIdsChunk,
            start,
            end,
            terminateAfter: config.serviceMapTerminateAfter,
            serviceMapMaxAllowableBytes: config.serviceMapMaxAllowableBytes,
            numOfRequests: chunks.length,
            logger,
          })
        )
      );
    });

    logger.debug('Received chunk responses');

    const mergedResponses = chunkedResponses.reduce((prev, current) => {
      return {
        connections: prev.connections.concat(current.connections),
        discoveredServices: prev.discoveredServices.concat(current.discoveredServices),
      };
    });

    logger.debug('Merged responses');

    return {
      connections: mergedResponses.connections,
      discoveredServices: mergedResponses.discoveredServices,
      tracesCount: traceIds.length,
    };
  });
}

export function getServiceMap(
  options: IEnvOptions & { maxNumberOfServices: number }
): Promise<ServiceMapResponse> {
  return withApmSpan('get_service_map', async () => {
    const { logger } = options;
    const anomaliesPromise = getServiceAnomalies(
      options

      // always catch error to avoid breaking service maps if there is a problem with ML
    ).catch((error) => {
      logger.debug(`Unable to retrieve anomalies for service maps.`, { error });
      return DEFAULT_ANOMALIES;
    });

    const [connectionData, servicesData, anomalies] = await Promise.all([
      getConnectionData(options),
      getServiceStats(options),
      anomaliesPromise,
    ]);

    logger.debug('Received and parsed all responses');

    if ('spans' in connectionData) {
      return {
        spans: connectionData.spans,
        tracesCount: connectionData.tracesCount,
        servicesData,
        anomalies,
      };
    }

    const serviceMapNodes = getServiceMapNodes({
      connections: connectionData.connections,
      exitSpanDestinations: connectionData.discoveredServices,
      servicesData,
      anomalies,
    });

    return {
      ...serviceMapNodes,
      tracesCount: connectionData.tracesCount,
      nodesCount: serviceMapNodes.nodesCount,
    };
  });
}
