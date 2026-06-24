/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { getSeverityType } from '@kbn/ml-anomaly-utils/get_severity_type';
import { getRollupIntervalForTimeRange } from '@kbn/apm-data-access-plugin/server/utils';
import { ApmDocumentType } from '../../../../common/document_type';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getInternalSavedObjectsClient } from '../../../lib/helpers/get_internal_saved_objects_client';
import { getServicesItems } from '../../../routes/services/get_services/get_services_items';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../../types';
import { buildApmToolResources } from '../../utils/build_apm_tool_resources';
import { parseDatemath } from '../../utils/time';
import { getServicesFromLogsAndMetricsIndices } from './get_services_from_logs_and_metrics_indices';
import { mergeServices } from './merge_services';
import type { GetServicesItem, GetServicesResponse } from './types';

/** Converts microseconds to milliseconds. Returns undefined for null/0/undefined. */
function toMilliseconds(us: number | null | undefined): number | undefined {
  if (us) {
    return us / 1000;
  }
}

async function getLogsIndices({
  core,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  logger: Logger;
}): Promise<string[]> {
  const [coreStart, pluginsStart] = await core.getStartServices();
  const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);

  try {
    const logSourcesService =
      await pluginsStart.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
        savedObjectsClient
      );
    const logSources = await logSourcesService.getLogSources();
    return logSources.map(({ indexPattern }) => indexPattern);
  } catch (error) {
    logger.warn(`Failed to resolve logs indices: ${error.message}`);
    return [];
  }
}

async function getMetricsIndices({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): Promise<string[]> {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);

  try {
    const metricIndices = await plugins.metricsDataAccess.client.getMetricIndices({
      savedObjectsClient,
    });
    return metricIndices.split(',').map((index) => index.trim());
  } catch (error) {
    logger.warn(`Failed to resolve metrics indices: ${error.message}`);
    return ['metrics-*'];
  }
}

/**
 * Canonical implementation of the agent-builder `get_services` capability.
 *
 * Returns a merged, agent-shaped list of services from APM + logs + metrics
 * data sources. APM-instrumented services come with full metadata (latency,
 * error rate, throughput, anomaly severity, alerts count). Services that
 * appear only in logs or metrics indices are returned with name and
 * environment only.
 *
 * Called by both the AB inline tool (in-process) and the public HTTP route.
 */
export async function getServices({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  anomalySeverities,
  kqlFilter,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  start: string;
  end: string;
  anomalySeverities?: ML_ANOMALY_SEVERITY[];
  kqlFilter?: string;
}): Promise<GetServicesResponse> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });

  const { apmEventClient, apmAlertsClient, mlClient, randomSamplerSeed, esClient } =
    await buildApmToolResources({ core, plugins, request });

  const [logsIndices, metricsIndices] = await Promise.all([
    getLogsIndices({ core, logger }),
    getMetricsIndices({ core, plugins, logger }),
  ]);

  const [apmResponse, logsAndMetricsServices] = await Promise.all([
    getServicesItems({
      apmEventClient,
      apmAlertsClient,
      randomSampler: { seed: randomSamplerSeed, probability: 1 },
      mlClient,
      logger,
      environment: ENVIRONMENT_ALL.value,
      kuery: kqlFilter ?? '',
      start: startMs,
      end: endMs,
      serviceGroup: null,
      documentType: ApmDocumentType.TransactionMetric,
      rollupInterval: getRollupIntervalForTimeRange(startMs, endMs),
      // Note: This will not work for pre 8.7 data. See: https://github.com/elastic/kibana/issues/167578
      useDurationSummary: true,
    }),
    getServicesFromLogsAndMetricsIndices({
      esClient,
      logsIndices,
      metricsIndices,
      start: startMs,
      end: endMs,
      kqlFilter,
      logger,
    }),
  ]);

  const apmServices = apmResponse?.items ?? [];

  const normalizedApmServices: GetServicesItem[] = apmServices
    .filter((service) => {
      if (!anomalySeverities?.length) return true;
      const severity =
        service.anomalyScore === undefined
          ? ML_ANOMALY_SEVERITY.UNKNOWN
          : getSeverityType(service.anomalyScore);
      return anomalySeverities.includes(severity);
    })
    .map((service) => ({
      ...service,
      anomalySeverity:
        service.anomalyScore !== undefined
          ? getSeverityType(service.anomalyScore)
          : ML_ANOMALY_SEVERITY.UNKNOWN,
      latency: toMilliseconds(service.latency ?? null),
    }));

  const services = mergeServices({
    apmServices: normalizedApmServices,
    // When filtering by anomaly severity, the agent is asking specifically for
    // APM-instrumented services with ML anomaly data — exclude non-APM ones.
    logsAndMetricsServices: anomalySeverities?.length ? [] : logsAndMetricsServices,
  });

  return {
    services,
    maxCountExceeded: apmResponse?.maxCountExceeded ?? false,
    serviceOverflowCount: apmResponse?.serviceOverflowCount ?? 0,
  };
}
