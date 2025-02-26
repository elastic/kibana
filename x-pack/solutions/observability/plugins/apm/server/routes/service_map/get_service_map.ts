/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ServiceMapResponse } from '../../../common/service_map';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { fetchPathsFromTraceIds } from './fetch_service_paths_from_trace_ids';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';

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

    const spans = await withApmSpan('get_service_map_spans_and_transactions_from_traces', () =>
      fetchPathsFromTraceIds({
        apmEventClient,
        traceIds,
        start,
        end,
        logger,
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

    return {
      spans: connectionData.spans,
      tracesCount: connectionData.tracesCount,
      servicesData,
      anomalies,
    };
  });
}
