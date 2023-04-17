/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { APIReturnType } from '../../services/rest/create_call_apm_api';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import { useApmServiceContext } from '../apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../hooks/use_apm_params';
import { useTimeRange } from '../../hooks/use_time_range';

type MobileDataPoints =
  APIReturnType<'GET /internal/apm/services/{serviceName}/mobile/filters'>['mobileFilters'];
export const MobileFiltersChartsContext = React.createContext<{
  status: FETCH_STATUS;
  mobileDataPoints: MobileDataPoints;
}>({
  status: FETCH_STATUS.NOT_INITIATED,
  mobileDataPoints: [],
});

export function MobileFiltersChartsContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { serviceName } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo, transactionType },
  } = useAnyOfApmParams(
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = { mobileFilters: [] }, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/mobile/filters',
        {
          params: {
            path: { serviceName },
            query: { start, end, environment, kuery, transactionType },
          },
        }
      );
    },
    [start, end, environment, kuery, serviceName, transactionType]
  );

  return (
    <MobileFiltersChartsContext.Provider
      value={{ status, mobileDataPoints: data.mobileFilters }}
    >
      {children}
    </MobileFiltersChartsContext.Provider>
  );
}
