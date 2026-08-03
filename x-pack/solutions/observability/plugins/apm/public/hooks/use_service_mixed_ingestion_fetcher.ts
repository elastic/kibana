/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from './use_fetcher';

export function useServiceMixedIngestionFetcher({
  serviceName,
  environment,
  kuery,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  kuery: string;
  start: string;
  end: string;
}) {
  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        return callApmApi('GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion', {
          params: {
            path: { serviceName },
            query: { start, end, environment, kuery },
          },
        });
      }
    },
    [serviceName, environment, kuery, start, end]
  );

  return { data, status, error };
}
