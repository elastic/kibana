/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { getWaterfall } from './WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

const INITIAL_DATA = {
  root: undefined,
  trace: { items: [], exceedsMax: false, errorDocs: [] },
  errorsPerTransaction: {},
};

export function useWaterfallFetcher() {
  const { urlParams } = useUrlParams();
  const { traceId, start, end, transactionId } = urlParams;
  const { data = INITIAL_DATA, status, error } = useFetcher(
    (callApmApi) => {
      if (traceId && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/traces/{traceId}',
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

  const waterfall = useMemo(() => getWaterfall(data, transactionId), [
    data,
    transactionId,
  ]);

  return { waterfall, status, error, exceedsMax: data.trace.exceedsMax };
}
