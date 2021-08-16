/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useFetcher } from './use_fetcher';

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
    urlParams: { start, end },
  } = useUrlParams();
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
