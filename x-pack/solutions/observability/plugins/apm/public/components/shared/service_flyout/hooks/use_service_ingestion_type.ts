/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { HttpStart } from '@kbn/core/public';
import type { Environment } from '../../../../../common/environment_rt';
import type { ServiceFlyoutIngestionType } from '../service_flyout_context';

interface Params {
  http: HttpStart;
  serviceName: string;
  environment: Environment;
  start: string;
  end: string;
}

export function useServiceIngestionType({ http, serviceName, environment, start, end }: Params): {
  ingestionType: ServiceFlyoutIngestionType | undefined;
  isLoading: boolean;
} {
  const { value, loading } = useAbortableAsync(
    ({ signal }) =>
      http.fetch<{ ingestionType: ServiceFlyoutIngestionType }>(
        `/internal/apm/services/${encodeURIComponent(serviceName)}/ingestion_type`,
        { query: { environment, start, end }, signal }
      ),
    [http, serviceName, environment, start, end]
  );

  return { ingestionType: value?.ingestionType, isLoading: loading };
}
