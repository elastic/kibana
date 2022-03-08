/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { getWaterfall } from './waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

const INITIAL_DATA = {
  errorDocs: [],
  traceDocs: [],
  exceedsMax: false,
};

export function useWaterfallFetcher() {
  const { urlParams } = useLegacyUrlParams();
  const { traceId, transactionId } = urlParams;

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    data = INITIAL_DATA,
    status,
    error,
  } = useFetcher(
    (callApmApi) => {
      if (traceId && start && end) {
        return callApmApi('GET /internal/apm/traces/{traceId}', {
          params: {
            path: { traceId },
            query: {
              start,
              end,
            },
          },
        });
      }
    },
    [traceId, start, end]
  );

  const waterfall = useMemo(
    () => getWaterfall(data, transactionId),
    [data, transactionId]
  );

  return { waterfall, status, error };
}
