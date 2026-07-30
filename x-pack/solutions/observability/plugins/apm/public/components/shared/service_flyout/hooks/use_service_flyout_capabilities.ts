/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { HttpStart } from '@kbn/core/public';
import type { ServiceSchemaType } from '@kbn/apm-types';
import type { Environment } from '../../../../../common/environment_rt';
import type { ServiceFlyoutCapabilities } from '../service_flyout_context';

interface Params {
  http: HttpStart;
  serviceName: string;
  environment: Environment;
  start: string;
  end: string;
}

const CAPABILITIES_BY_SCHEMA: Record<
  ServiceSchemaType,
  Pick<ServiceFlyoutCapabilities, 'header' | 'overview' | 'footer'>
> = {
  ecs: {
    header: { serviceNameLink: true, badges: true },
    overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
    footer: { alerts: true, slos: true },
  },
  otel: {
    // OTel services do not emit APM transaction documents, so transaction-based
    // capabilities (table, type filter, infra metrics, badges, alerts, SLOs) are
    // hidden. Key metrics charts still render using OTel-specific queries.
    header: { serviceNameLink: false, badges: false },
    overview: { transactions: false, transactionTypeFilter: false, infraMetrics: false },
    footer: { alerts: false, slos: false },
  },
  // No ECS data found in the selected time window — schema is indeterminate.
  // Show full capabilities so the flyout is not degraded for a quiet ECS service.
  unknown: {
    header: { serviceNameLink: true, badges: true },
    overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
    footer: { alerts: true, slos: true },
  },
};

export function useServiceFlyoutCapabilities({
  http,
  serviceName,
  environment,
  start,
  end,
}: Params): ServiceFlyoutCapabilities {
  const { value, loading, error } = useAbortableAsync(
    ({ signal }) =>
      http.fetch<{ schema: ServiceSchemaType }>(
        `/internal/apm/services/${encodeURIComponent(serviceName)}/ingestion_type`,
        { query: { environment, start, end }, signal }
      ),
    [http, serviceName, environment, start, end]
  );

  if (!value) {
    if (error) {
      // Capabilities fetch failed — fall back to full capabilities so the flyout
      // remains usable. The failure is visible in monitoring tools.
      return {
        loading: false,
        error: undefined,
        schema: 'unknown' as const,
        ...CAPABILITIES_BY_SCHEMA.unknown,
      };
    }
    return {
      loading,
      error,
      schema: undefined,
      header: undefined,
      overview: undefined,
      footer: undefined,
    };
  }

  return {
    loading: false,
    error: undefined,
    schema: value.schema,
    ...CAPABILITIES_BY_SCHEMA[value.schema],
  };
}
