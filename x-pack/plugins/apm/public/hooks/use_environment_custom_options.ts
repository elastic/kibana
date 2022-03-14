/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useFetcher } from './use_fetcher';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../common/environment_filter_values';

export function useEnvironmentCustomOptions({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
}) {
  const { data } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/observability_overview/has_not_defined_environment',
        {
          params: {
            query: {
              serviceName,
              start,
              end,
            },
          },
        }
      );
    },
    [serviceName, start, end],
    { preservePreviousData: false }
  );

  return [
    ENVIRONMENT_ALL,
    ...(data?.hasNotDefinedEnvironment ? [ENVIRONMENT_NOT_DEFINED] : []),
  ];
}
