/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';

export function useInstanceDetailsFetcher({
  serviceName,
  serviceNodeName,
}: {
  serviceName: string;
  serviceNodeName: string;
}) {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
        {
          params: {
            path: {
              serviceName,
              serviceNodeName,
            },
            query: { start, end },
          },
        }
      );
    },
    [serviceName, serviceNodeName, start, end]
  );

  return { data, status };
}
