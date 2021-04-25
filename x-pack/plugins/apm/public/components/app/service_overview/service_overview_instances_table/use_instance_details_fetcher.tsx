/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';

export function useInstanceDetailsFetcher({
  serviceName,
  serviceNodeName,
}: {
  serviceName: string;
  serviceNodeName: string;
}) {
  const {
    urlParams: { start, end, kuery, environment },
  } = useUrlParams();
  const { transactionType } = useApmServiceContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType) {
        return;
      }
      return callApmApi({
        endpoint:
          'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
        params: {
          path: {
            serviceName,
            serviceNodeName,
          },
          query: { start, end, transactionType, environment, kuery },
        },
      });
    },
    [
      serviceName,
      serviceNodeName,
      start,
      end,
      transactionType,
      environment,
      kuery,
    ]
  );

  return { data, status };
}
