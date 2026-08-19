/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Environment } from '../../../common/environment_rt';
import { useFetcher } from '../../hooks/use_fetcher';

const INITIAL_STATE = {
  agentName: undefined,
  runtimeName: undefined,
  serverlessType: undefined,
  telemetrySdkName: undefined,
  telemetrySdkLanguage: undefined,
};

export function useServiceAgentFetcher({
  serviceName,
  environment,
  start,
  end,
}: {
  serviceName?: string;
  environment: Environment;
  start: string;
  end: string;
}) {
  const {
    data = INITIAL_STATE,
    error,
    status,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        return callApmApi('GET /internal/apm/services/{serviceName}/agent', {
          params: {
            path: { serviceName },
            query: { environment, start, end },
          },
        });
      }
    },
    [serviceName, environment, start, end]
  );

  return { ...data, status, error };
}
