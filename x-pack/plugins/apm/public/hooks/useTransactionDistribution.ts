/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadTransactionDistribution } from '../services/rest/apm/transaction_groups';
import { IUrlParams } from '../store/urlParams';
import { useFetcher } from './useFetcher';

const INITIAL_DATA = {
  buckets: [],
  totalHits: 0,
  bucketSize: 0,
  defaultSample: undefined
};

export function useTransactionDistribution(urlParams: IUrlParams) {
  const {
    serviceName,
    transactionType,
    transactionId,
    traceId,
    start,
    end,
    transactionName,
    kuery
  } = urlParams;

  const { data = INITIAL_DATA, status, error } = useFetcher(
    () =>
      loadTransactionDistribution({
        serviceName,
        transactionType,
        transactionId,
        traceId,
        start,
        end,
        transactionName,
        kuery
      }),
    [
      serviceName,
      transactionType,
      transactionId,
      traceId,
      start,
      end,
      transactionName,
      kuery
    ]
  );

  return { data, status, error };
}
