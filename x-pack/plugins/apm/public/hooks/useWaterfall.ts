/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { getWaterfall } from '../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { loadTrace } from '../services/rest/apm/traces';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';

const INITIAL_DATA = { trace: [], errorsPerTransaction: {} };

export function useWaterfall(urlParams: IUrlParams) {
  const { traceId, start, end, transactionId } = urlParams;
  const { data = INITIAL_DATA, status, error } = useFetcher(
    () => {
      if (traceId && start && end) {
        return loadTrace({ traceId, start, end });
      }
    },
    [traceId, start, end]
  );

  const waterfall = useMemo(() => getWaterfall(data, transactionId), [
    data,
    transactionId
  ]);

  return { data: waterfall, status, error };
}
