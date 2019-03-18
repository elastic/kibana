/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getWaterfall } from '../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { loadTrace } from '../services/rest/apm/traces';
import { IUrlParams } from '../store/urlParams';
import { useFetcher } from './useFetcher';

const INITIAL_DATA = { trace: [], errorsPerTransaction: {} };

export function useWaterfall(urlParams: IUrlParams) {
  const { traceId, start, end } = urlParams;
  const { data = INITIAL_DATA, status, error } = useFetcher(loadTrace, {
    traceId,
    start,
    end
  });

  // TODO consider wrapping in `useMemo`
  const waterfall = getWaterfall(
    data.trace,
    data.errorsPerTransaction,
    urlParams.transactionId
  );

  return { data: waterfall, status, error };
}
