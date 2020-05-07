/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';
import { getWaterfall } from '../components/app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

const INITIAL_DATA = {
  root: undefined,
  trace: { items: [], exceedsMax: false, errorDocs: [] },
  errorsPerTransaction: {}
};

export function useWaterfall(urlParams: IUrlParams) {
  const { traceId, start, end, transactionId } = urlParams;
  const { data = INITIAL_DATA, status, error } = useFetcher(
    callApmApi => {
      if (traceId && start && end) {
        return callApmApi({
          pathname: '/api/apm/traces/{traceId}',
          params: {
            path: { traceId },
            query: {
              start,
              end
            }
          }
        });
      }
    },
    [traceId, start, end]
  );

  const waterfall = useMemo(() => getWaterfall(data, transactionId), [
    data,
    transactionId
  ]);

  return { waterfall, status, error, exceedsMax: data.trace.exceedsMax };
}
