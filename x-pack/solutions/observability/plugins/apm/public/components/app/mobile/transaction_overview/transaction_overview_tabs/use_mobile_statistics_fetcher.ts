/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { useApmServiceContext } from '../../../../../context/apm_service/use_apm_service_context';
import { useFetcher } from '../../../../../hooks/use_fetcher';
import { isTimeComparison } from '../../../../shared/time_comparison/get_comparison_options';

const INITIAL_STATE_MAIN_STATISTICS = {
  mainStatistics: [],
  requestId: undefined,
  totalItems: 0,
};

const INITIAL_STATE_DETAILED_STATISTICS = {
  currentPeriod: {},
  previousPeriod: {},
};

interface Props {
  field: string;
  environment: string;
  start: string;
  end: string;
  kuery: string;
  comparisonEnabled: boolean;
  offset?: string;
}

export function useMobileStatisticsFetcher({
  field,
  environment,
  start,
  end,
  kuery,
  comparisonEnabled,
  offset,
}: Props) {
  const { serviceName } = useApmServiceContext();

  const { data = INITIAL_STATE_MAIN_STATISTICS, status: mainStatisticsStatus } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/mobile-services/{serviceName}/main_statistics', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              field,
            },
          },
        }).then((response) => {
          return {
            // Everytime the main statistics is refetched, updates the requestId making the comparison API to be refetched.
            requestId: uuidv4(),
            mainStatistics: response.mainStatistics,
            totalItems: response.mainStatistics.length,
          };
        });
      }
    },
    [environment, start, end, kuery, serviceName, field]
  );

  const { mainStatistics, requestId, totalItems } = data;

  const {
    data: detailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: detailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (totalItems && start && end) {
        return callApmApi('GET /internal/apm/mobile-services/{serviceName}/detailed_statistics', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              field,
              fieldValues: JSON.stringify(data?.mainStatistics.map(({ name }) => name).sort()),
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            },
          },
        });
      }
    },
    // only fetches agg results when requestId changes

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  return {
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  };
}
