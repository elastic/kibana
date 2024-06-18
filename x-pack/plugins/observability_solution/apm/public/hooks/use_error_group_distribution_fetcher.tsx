/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isTimeComparison } from '../components/shared/time_comparison/get_comparison_options';
import { useFetcher } from './use_fetcher';

export function useErrorGroupDistributionFetcher({
  serviceName,
  groupId,
  kuery,
  environment,
  start,
  end,
  comparisonEnabled,
  offset,
}: {
  serviceName: string;
  groupId: string | undefined;
  kuery: string;
  environment: string;
  start: string;
  end: string;
  comparisonEnabled: boolean;
  offset: string | undefined;
}) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/services/{serviceName}/errors/distribution', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              groupId,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, offset, groupId, comparisonEnabled]
  );

  return {
    errorDistributionData: data,
    errorDistributionStatus: status,
  };
}
