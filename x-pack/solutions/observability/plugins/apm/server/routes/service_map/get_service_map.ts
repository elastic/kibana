/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ServiceMapSpan } from '../../../common/service_map/types';
import { type ServiceMapResponse } from '../../../common/service_map';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';
import { fetchExitSpanSamplesFromTraceIds } from './fetch_exit_span_samples';
import {
  isPrecomputedServiceMapAvailable,
  getPrecomputedServiceMap,
  convertEdgesToServiceMapSpans,
} from './transforms';

export interface IEnvOptions {
  mlClient?: MlClient;
  config: APMConfig;
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  serviceName?: string;
  environment: string;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroupKuery?: string;
  kuery?: string;
  usePrecomputedServiceMap?: boolean;
}

async function getConnectionData({
  config,
  apmEventClient,
  esClient,
  serviceName,
  environment,
  start,
  end,
  serviceGroupKuery,
  kuery,
  logger,
  usePrecomputedServiceMap,
}: IEnvOptions): Promise<{ tracesCount: number; spans: ServiceMapSpan[] }> {
  return withApmSpan('get_service_map_connections', async () => {
    // Try pre-computed service map from OneWorkflow if enabled
    if (usePrecomputedServiceMap) {
      const available = await isPrecomputedServiceMapAvailable(esClient);
      if (available) {
        logger.debug('Using OneWorkflow pre-computed service map');
        const { edges } = await getPrecomputedServiceMap({
          esClient,
          start,
          end,
          environment,
          serviceName,
        });
        const spans = convertEdgesToServiceMapSpans(edges);
        return { spans, tracesCount: 0 }; // tracesCount not applicable for pre-computed
      }
      logger.debug('Pre-computed service map not available, falling back to sampling');
    }

    // Fall back to trace sampling approach
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

    return {
      spans: connectionData.spans,
      tracesCount: connectionData.tracesCount,
      servicesData,
      anomalies,
    };
  });
}
