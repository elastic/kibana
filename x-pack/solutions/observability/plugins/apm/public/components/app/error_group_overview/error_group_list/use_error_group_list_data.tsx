/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useStateDebounced } from '../../../../hooks/use_debounce';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { TableOptions } from '../../../shared/managed_table';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';

type MainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;
type DetailedStatistics =
  APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

export type ErrorGroupItem = MainStatistics['errorGroups'][0];

const INITIAL_MAIN_STATISTICS: MainStatistics & { requestId: string } = {
  requestId: '',
  errorGroups: [],
  maxCountExceeded: false,
};

const INITIAL_STATE_DETAILED_STATISTICS: DetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

export function useErrorGroupListData({
  renderedItems,
  sorting,
}: {
  renderedItems: ErrorGroupItem[];
  sorting: TableOptions<ErrorGroupItem>['sort'];
}) {
  const { serviceName } = useApmServiceContext();
  const [searchQuery, setDebouncedSearchQuery] = useStateDebounced('');

  const {
    query: { environment, kuery, rangeFrom, rangeTo, offset, comparisonEnabled },
  } = useAnyOfApmParams('/services/{serviceName}/overview', '/services/{serviceName}/errors');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: mainStatistics = INITIAL_MAIN_STATISTICS, status: mainStatisticsStatus } =
    useFetcher(
      (callApmApi) => {
        if (start && end) {
          return callApmApi(
            'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
            {
              params: {
                path: { serviceName },
                query: {
                  environment,
                  kuery,
                  start,
                  end,
                  sortField: sorting.field,
                  sortDirection: sorting.direction,
                  searchQuery,
                },
              },
            }
          ).then((response) => {
            return {
              ...response,
              requestId: uuidv4(),
            };
          });
        }
      },
      [sorting.direction, sorting.field, start, end, serviceName, environment, kuery, searchQuery]
    );

  const {
    data: detailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: detailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (mainStatistics.requestId && renderedItems.length && start && end) {
        return callApmApi(
          'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                numBuckets: 20,
                offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              },
              body: {
                groupIds: JSON.stringify(renderedItems.map(({ groupId }) => groupId).sort()),
              },
            },
          }
        );
      }
    },
    // only fetches agg results when main statistics are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainStatistics.requestId, renderedItems, comparisonEnabled, offset],
    { preservePreviousData: false }
  );

  return {
    setDebouncedSearchQuery,
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  };
}
