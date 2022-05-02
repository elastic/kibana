/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from './use_fetcher';

const INITIAL_DATA = { environments: [] };

export function useEnvironmentsFetcher({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
}) {
  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/environments', {
          params: {
            query: {
              start,
              end,
              serviceName,
            },
          },
        });
      }
    },
    [start, end, serviceName]
  );

  return { environments: data.environments, status };
}
