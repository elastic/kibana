/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getTransactionCharts } from '../selectors/chartSelectors';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';
import { useDateBucketOptions } from './use_date_bucket_options';

export function useTransactionCharts() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const {
    urlParams: { transactionType, start, end, transactionName },
    uiFilters,
  } = useUrlParams();

  const { bucketSizeInSeconds, unit, intervalString } = useDateBucketOptions();

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/transaction_groups/charts',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              transactionType,
              transactionName,
              uiFilters: JSON.stringify(uiFilters),
              bucketSizeInSeconds,
              unit,
              intervalString,
            },
          },
        });
      }
    },
    [
      serviceName,
      start,
      end,
      transactionName,
      transactionType,
      uiFilters,
      bucketSizeInSeconds,
      unit,
      intervalString,
    ]
  );

  const memoizedData = useMemo(() => getTransactionCharts(unit, data), [
    data,
    unit,
  ]);

  return {
    data: memoizedData,
    status,
    error,
  };
}
