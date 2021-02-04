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
}: {
  serviceName: string;
  groupId: string | undefined;
}) {
  const { urlParams, uiFilters } = useUrlParams();
  const { environment, start, end } = urlParams;
  const { data } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/errors/distribution',
          params: {
            path: { serviceName },
            query: {
              environment,
              start,
              end,
              groupId,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [environment, serviceName, start, end, groupId, uiFilters]
  );

  return { errorDistributionData: data };
}
