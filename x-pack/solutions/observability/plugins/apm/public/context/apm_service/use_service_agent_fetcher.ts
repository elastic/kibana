/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../hooks/use_fetcher';
import { useEntityCentricExperienceSetting } from '../../hooks/use_entity_centric_experience_setting';

const INITIAL_STATE = {
  agentName: undefined,
  runtimeName: undefined,
  serverlessType: undefined,
  telemetrySdkName: undefined,
  telemetrySdkLanguage: undefined,
};

export function useServiceAgentFetcher({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start: string;
  end: string;
}) {
  const { isEntityCentricExperienceEnabled } = useEntityCentricExperienceSetting();

  const {
    data = INITIAL_STATE,
    error,
    status,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        if (isEntityCentricExperienceEnabled) {
          return callApmApi('GET /internal/apm/entities/services/{serviceName}/agent', {
            params: {
              path: { serviceName },
              query: { start, end },
            },
          });
        } else {
          return callApmApi('GET /internal/apm/services/{serviceName}/agent', {
            params: {
              path: { serviceName },
              query: { start, end },
            },
          });
        }
      }
    },
    [serviceName, start, end, isEntityCentricExperienceEnabled]
  );

  return { ...data, status, error };
}
