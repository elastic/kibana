/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { TimeRangeMetadata } from '../../../common/time_range_metadata';
import { useApmParams } from '../../hooks/use_apm_params';
import { useApmRoutePath } from '../../hooks/use_apm_route_path';
import { FetcherResult, useFetcher } from '../../hooks/use_fetcher';
import { useTimeRange } from '../../hooks/use_time_range';

export const TimeRangeMetadataContext = createContext<
  FetcherResult<TimeRangeMetadata> | undefined
>(undefined);

export function TimeRangeMetadataContextProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const { query } = useApmParams('/*');

  const kuery = 'kuery' in query ? query.kuery : '';

  const range =
    'rangeFrom' in query && 'rangeTo' in query
      ? { rangeFrom: query.rangeFrom, rangeTo: query.rangeTo }
      : undefined;

  if (!range) {
    throw new Error('rangeFrom/rangeTo missing in URL');
  }

  const { start, end } = useTimeRange(range);

  const routePath = useApmRoutePath();

  const isOperationView =
    routePath === '/dependencies/operation' ||
    routePath === '/dependencies/operations';

  const fetcherResult = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/time_range_metadata', {
        params: {
          query: {
            start,
            end,
            kuery,
            useSpanName: isOperationView,
          },
        },
      });
    },
    [start, end, kuery, isOperationView]
  );

  return (
    <TimeRangeMetadataContext.Provider value={fetcherResult}>
      {children}
    </TimeRangeMetadataContext.Provider>
  );
}
