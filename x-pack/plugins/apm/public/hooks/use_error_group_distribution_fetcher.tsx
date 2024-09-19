/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useApmParams } from './use_apm_params';
import { useFetcher } from './use_fetcher';
import { useTimeRange } from './use_time_range';

export function useErrorGroupDistributionFetcher({
  serviceName,
  groupId,
  kuery,
  environment,
}: {
  serviceName: string;
  groupId: string | undefined;
  kuery: string;
  environment: string;
}) {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/errors/distribution',
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              groupId,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, groupId]
  );

  return { errorDistributionData: data };
}
