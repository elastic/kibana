/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoolQuery } from '@kbn/es-query';
import type { ServiceMapSpan } from '../../../common/service_map/types';
import { type ServiceMapResponse } from '../../../common/service_map';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';
import { fetchExitSpanSamplesFromTraceIds } from './fetch_exit_span_samples';
import { getServiceCallGraph } from './get_service_call_graph';
import { matchCallGraphToServices } from './match_service_call_graph';

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
  /** Pre-built ES query from the client (query + filter bar + Controls API). */
  esQuery?: { bool: BoolQuery };
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
  esQuery,
  logger,
}: IEnvOptions): Promise<{ tracesCount: number; spans: ServiceMapSpan[] }> {
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
      esQuery,
    });

    logger.debug(`Found ${traceIds.length} traces to inspect`);

    if (traceIds.length === 0) {
      return { spans: [], tracesCount: 0 };
    }

    const spans = await withApmSpan('get_service_map_exit_spans_and_transactions_from_traces', () =>
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
  });
}

export function getServiceMap(
  options: IEnvOptions & {
    maxNumberOfServices: number;
    /** When off, the call graph query does not run and the map is unchanged. */
    groupingEnabled?: boolean;
  }
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

    // A service page map stays ungrouped. A failed query leaves this map unchanged.
    const callGraphPromise =
      options.groupingEnabled && !options.serviceName
        ? getServiceCallGraph(options).catch((error) => {
            logger.debug(`Unable to retrieve the call graph for service maps.`, { error });
            return undefined;
          })
        : Promise.resolve(undefined);

    const [connectionData, servicesData, anomalies, callGraph] = await Promise.all([
      getConnectionData(options),
      getServiceStats(options),
      anomaliesPromise,
      callGraphPromise,
    ]);

    // Group selection will use this list. It stays off the response until then.
    if (callGraph) {
      try {
        matchCallGraphToServices({
          callGraph,
          spans: connectionData.spans,
          serviceNames: servicesData.map((service) => service[SERVICE_NAME]),
        });
      } catch (error) {
        logger.debug(`Unable to match the call graph for service maps.`, { error });
      }
    }

    logger.debug('Received and parsed all responses');

    return {
      spans: connectionData.spans,
      tracesCount: connectionData.tracesCount,
      servicesData,
      anomalies,
    };
  });
}
