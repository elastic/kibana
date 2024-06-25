/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKueryWithMobileFilters } from '../../common/utils/get_kuery_with_mobile_filters';
import { useApmParams } from './use_apm_params';
import { useFetcher } from './use_fetcher';
import { useTimeRange } from './use_time_range';

export function useFallbackToTransactionsFetcher({ kuery }: { kuery: string }) {
  const { query } = useApmParams('/*');

  const rangeFrom = 'rangeFrom' in query ? query.rangeFrom : undefined;
  const rangeTo = 'rangeTo' in query ? query.rangeTo : undefined;

  const device = 'device' in query ? query.device : undefined;
  const osVersion = 'osVersion' in query ? query.osVersion : undefined;
  const appVersion = 'appVersion' in query ? query.appVersion : undefined;
  const netConnectionType = 'netConnectionType' in query ? query.netConnectionType : undefined;

  const kueryWithFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo, optional: true });

  const { data = { fallbackToTransactions: false } } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/fallback_to_transactions', {
          params: {
            query: {
              kuery: kueryWithFilters,
              start,
              end,
            },
          },
        });
      }
    },
    [kueryWithFilters, start, end]
  );

  return data;
}
