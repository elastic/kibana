/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetServicesItem } from './types';
import type { ServiceFromIndex } from './get_services_from_logs_and_metrics_indices';

/**
 * Merges APM-instrumented services (with full metadata) with services
 * discovered only in logs/metrics indices (name + environment only).
 * APM services take precedence — non-APM services are added only when
 * a service with the same name is not already in the APM set.
 */
export function mergeServices({
  apmServices,
  logsAndMetricsServices,
}: {
  apmServices: GetServicesItem[];
  logsAndMetricsServices: ServiceFromIndex[];
}): GetServicesItem[] {
  const serviceMap = new Map<string, GetServicesItem>();

  for (const service of apmServices) {
    serviceMap.set(service.serviceName, service);
  }

  for (const service of logsAndMetricsServices) {
    if (!serviceMap.has(service.serviceName)) {
      serviceMap.set(service.serviceName, {
        serviceName: service.serviceName,
        environments: service.environment ? [service.environment] : undefined,
      });
    }
  }

  return Array.from(serviceMap.values());
}
