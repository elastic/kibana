/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ServiceMapSpan } from '../../../common/service_map/types';
import { type ServiceMapResponse } from '../../../common/service_map';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import type { ApmSloClient } from '../../lib/helpers/get_apm_slo_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';
import { fetchExitSpanSamplesFromTraceIds } from './fetch_exit_span_samples';
import { getServicesAlerts } from '../services/get_services/get_service_alerts';
import { getServicesSloStats } from '../services/get_services/get_services_slo_stats';
import { mergeServiceMapData } from './merge_service_map_data';

export interface IEnvOptions {
  mlClient?: MlClient;
  config: APMConfig;
  apmEventClient: APMEventClient;
  apmAlertsClient: ApmAlertsClient;
  sloClient?: ApmSloClient;
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
    const { logger, apmAlertsClient, sloClient, maxNumberOfServices, start, end, environment } =
      options;
    const anomaliesPromise = getServiceAnomalies(
      options

      // always catch error to avoid breaking service maps if there is a problem with ML
    ).catch((error) => {
      logger.debug(`Unable to retrieve anomalies for service maps.`, { error });
      return DEFAULT_ANOMALIES;
    });

    const [connectionData, servicesData, anomalies, alertCounts] = await Promise.all([
      getConnectionData(options),
      getServiceStats(options).catch((error) => {
        logger.warn(`Unable to retrieve service stats for service map.`, { error });
        return [];
      }),
      anomaliesPromise,
      getServicesAlerts({
        apmAlertsClient,
        maxNumServices: maxNumberOfServices,
        start,
        end,
        environment,
        kuery: options.kuery,
        serviceGroup: undefined, // Service map doesn't use service groups for filtering
        serviceName: options.serviceName,
      }).catch((error) => {
        logger.debug(`Unable to retrieve alerts for service maps.`, { error });
        return [];
      }),
    ]);

    // Fetch SLO stats after we have service names
    const serviceNames = servicesData.map((service) => service['service.name']);
    const sloStats = await getServicesSloStats({
      sloClient,
      environment,
      maxNumServices: maxNumberOfServices,
      serviceNames,
    }).catch((error) => {
      logger.debug(`Unable to retrieve SLO stats for service maps.`, { error });
      return [];
    });

    logger.debug('Received and parsed all responses');

    // Merge all data sources into enriched services data for node coloring
    const enrichedServicesData = mergeServiceMapData({
      servicesData,
      anomalies,
      alertCounts,
      sloStats,
    });

    return {
      spans: connectionData.spans,
      tracesCount: connectionData.tracesCount,
      servicesData: enrichedServicesData,
      anomalies,
      alertCounts,
      sloStats,
    };
  });
}
