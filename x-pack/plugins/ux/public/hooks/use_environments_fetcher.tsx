/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from './use_fetcher';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../common/environment_filter_values';

function getEnvironmentOptions(environments: string[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED.value)
    .map((environment) => ({
      value: environment,
      text: environment,
    }));

  return [ENVIRONMENT_ALL, ...environmentOptions];
}

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
  const { data = INITIAL_DATA, status = 'loading' } = useFetcher(
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

  const environmentOptions = useMemo(
    () => getEnvironmentOptions(data.environments),
    [data?.environments]
  );

  return { environments: data.environments, status, environmentOptions };
}
