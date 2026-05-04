/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ServiceHealthStatus } from '../../../../common/service_health_status';

/** Inverse of `getServiceHealthStatus` — expands legacy buckets for filtering. */
export function mlSeveritiesForLegacyHealthFilter(
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
export function resolveFilterSeverities(args: {
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
