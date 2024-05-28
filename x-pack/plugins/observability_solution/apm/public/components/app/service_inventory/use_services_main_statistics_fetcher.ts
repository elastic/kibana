/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { ApmDocumentType } from '../../../../common/document_type';
import type { Environment } from '../../../../common/environment_rt';
import type { MergedServiceStat } from '../../../../server/routes/services/get_services/merge_service_stats';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  type PreferredDataSourceAndBucketSize,
  usePreferredDataSourceAndBucketSize,
} from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';

type MainStatisticsApiResponse = APIReturnType<'GET /internal/apm/services'>;

const INITIAL_DATA: MainStatisticsApiResponse & { requestId: string } = {
  requestId: '',
  items: [],
  serviceOverflowCount: 0,
  maxCountExceeded: false,
};

export interface MainStatisticsFetch {
  mainStatisticsData: {
    items: MergedServiceStat[];
    maxCountExceeded: boolean;
    serviceOverflowCount: number;
    requestId: string;
  };
  mainStatisticsStatus: FETCH_STATUS;
}

export function useServicesMainStatisticsFetcherWithoutContext({
  start,
  end,
  kuery,
  environment,
  serviceGroup,
  searchQuery,
  preferred,
  tableOptions,
}: {
  start: string;
  end: string;
  kuery: string;
  environment: Environment;
  serviceGroup: string;
  searchQuery?: string;
  preferred: PreferredDataSourceAndBucketSize<ApmDocumentType.ServiceTransactionMetric>;
  tableOptions: {
    page: number;
    pageSize: number;
    sortField?: string;
    sortDirection?: string;
  };
}): MainStatisticsFetch {
  const shouldUseDurationSummary = !!preferred?.source?.hasDurationSummaryField;

  const { data = INITIAL_DATA, status } = useProgressiveFetcher(
    (callApmApi) => {
      if (preferred) {
        return callApmApi('GET /internal/apm/services', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              serviceGroup,
              useDurationSummary: shouldUseDurationSummary,
              documentType: preferred.source.documentType,
              rollupInterval: preferred.source.rollupInterval,
              searchQuery,
            },
          },
        }).then((mainStatisticsData) => {
          return {
            requestId: v4(),
            ...mainStatisticsData,
          };
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      start,
      end,
      serviceGroup,
      preferred,
      searchQuery,
      // not used, but needed to update the requestId to call the details statistics API when table options are updated
      tableOptions.page,
      tableOptions.pageSize,
      tableOptions.sortField,
      tableOptions.sortDirection,
    ]
  );

  return { mainStatisticsData: data, mainStatisticsStatus: status };
}

export function useServicesMainStatisticsFetcher({
  initialPageSize,
  searchQuery,
}: {
  initialPageSize: number;
  searchQuery: string | undefined;
}): MainStatisticsFetch {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      serviceGroup,
      page = 0,
      pageSize = initialPageSize,
      sortDirection,
      sortField,
    },
  } = useApmParams('/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    numBuckets: 20,
    type: ApmDocumentType.ServiceTransactionMetric,
  });

  return useServicesMainStatisticsFetcherWithoutContext({
    environment,
    kuery,
    preferred,
    start,
    end,
    serviceGroup,
    tableOptions: {
      page,
      pageSize,
      sortDirection,
      sortField,
    },
    searchQuery,
  });
}
