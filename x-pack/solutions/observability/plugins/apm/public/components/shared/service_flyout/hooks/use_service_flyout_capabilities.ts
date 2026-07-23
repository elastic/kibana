/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { HttpStart } from '@kbn/core/public';
import type { Environment } from '../../../../../common/environment_rt';
import type {
  ServiceFlyoutCapabilities,
  ServiceFlyoutIngestionType,
} from '../service_flyout_context';

interface Params {
  http: HttpStart;
  serviceName: string;
  environment: Environment;
  start: string;
  end: string;
}

const CAPABILITIES_BY_INGESTION_TYPE: Record<
  ServiceFlyoutIngestionType,
  Pick<ServiceFlyoutCapabilities, 'header' | 'overview' | 'footer'>
> = {
  apm: {
    header: { serviceNameLink: true, badges: true },
    overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
    footer: { alerts: true, slos: true },
  },
  unprocessedOtel: {
    header: { serviceNameLink: false, badges: false },
    overview: { transactions: false, transactionTypeFilter: false, infraMetrics: false },
    footer: { alerts: false, slos: false },
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
      http.fetch<{ ingestionType: ServiceFlyoutIngestionType }>(
        `/internal/apm/services/${encodeURIComponent(serviceName)}/ingestion_type`,
        { query: { environment, start, end }, signal }
      ),
    [http, serviceName, environment, start, end]
  );

  if (!value) {
    return {
      loading,
      error,
      ingestionType: undefined,
      header: undefined,
      overview: undefined,
      footer: undefined,
    };
  }

  return {
    loading: false,
    error: undefined,
    ingestionType: value.ingestionType,
    ...CAPABILITIES_BY_INGESTION_TYPE[value.ingestionType],
  };
}
