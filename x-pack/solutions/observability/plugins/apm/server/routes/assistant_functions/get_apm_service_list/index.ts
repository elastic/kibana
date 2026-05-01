/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { Logger } from '@kbn/core/server';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { RollupInterval } from '../../../../common/rollup';
import { ApmDocumentType } from '../../../../common/document_type';
import { getSeverity } from '../../../../common/anomaly_detection';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
import { getServicesItems } from '../../services/get_services/get_services_items';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';

export interface ApmServicesListItem {
  'service.name': string;
  'agent.name'?: string;
  'transaction.type'?: string;
  alertsCount: number;
  anomalyScore?: number;
  'service.environment'?: string[];
}

/** Inverse of `getServiceHealthStatus` — expands legacy buckets for filtering. */
function mlSeveritiesForLegacyHealthFilter(
  healthStatuses: ServiceHealthStatus[]
): ML_ANOMALY_SEVERITY[] {
  const set = new Set<ML_ANOMALY_SEVERITY>();
  for (const status of healthStatuses) {
    switch (status) {
      case ServiceHealthStatus.critical:
        set.add(ML_ANOMALY_SEVERITY.CRITICAL);
        set.add(ML_ANOMALY_SEVERITY.MAJOR);
        break;
      case ServiceHealthStatus.warning:
        set.add(ML_ANOMALY_SEVERITY.MINOR);
        set.add(ML_ANOMALY_SEVERITY.WARNING);
        break;
      case ServiceHealthStatus.healthy:
        set.add(ML_ANOMALY_SEVERITY.LOW);
        break;
      case ServiceHealthStatus.unknown:
        set.add(ML_ANOMALY_SEVERITY.UNKNOWN);
        break;
      default:
        break;
    }
  }
  return Array.from(set);
}

/** Prefer `mlSeverities` when set; otherwise map deprecated `healthStatus` (saved prompts / automation). */
function resolveFilterSeverities(args: {
  mlSeverities?: ML_ANOMALY_SEVERITY[];
  healthStatus?: ServiceHealthStatus[];
}): ML_ANOMALY_SEVERITY[] | undefined {
  if (args.mlSeverities?.length) {
    return args.mlSeverities;
  }
  if (args.healthStatus?.length) {
    return mlSeveritiesForLegacyHealthFilter(args.healthStatus);
  }
  return undefined;
}

export async function getApmServiceList({
  arguments: args,
  apmEventClient,
  mlClient,
  apmAlertsClient,
  logger,
  randomSampler,
}: {
  arguments: {
    serviceEnvironment?: string | undefined;
    mlSeverities?: ML_ANOMALY_SEVERITY[] | undefined;
    /** @deprecated Prefer `mlSeverities`; kept for backward compatibility with older assistant calls. */
    healthStatus?: ServiceHealthStatus[] | undefined;
    start: string;
    end: string;
  };
  apmEventClient: APMEventClient;
  mlClient?: MlClient;
  apmAlertsClient: ApmAlertsClient;
  logger: Logger;
  randomSampler: RandomSampler;
}): Promise<ApmServicesListItem[]> {
  const filterSeverities = resolveFilterSeverities(args);

  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const serviceItems = await getServicesItems({
    apmAlertsClient,
    apmEventClient,
    documentType: ApmDocumentType.TransactionMetric,
    start,
    end,
    environment: args.serviceEnvironment || ENVIRONMENT_ALL.value,
    kuery: '',
    logger,
    randomSampler,
    rollupInterval: RollupInterval.OneMinute,
    serviceGroup: null,
    mlClient,
    useDurationSummary: false,
  });

  let mappedItems = serviceItems.items.map((item) => {
    return {
      'service.name': item.serviceName,
      'agent.name': item.agentName,
      alertsCount: item.alertsCount ?? 0,
      anomalyScore: item.anomalyScore,
      'service.environment': item.environments,
      'transaction.type': item.transactionType,
    };
  });

  if (filterSeverities?.length) {
    mappedItems = mappedItems.filter((item) =>
      filterSeverities.includes(getSeverity(item.anomalyScore))
    );
  }

  return mappedItems;
}
