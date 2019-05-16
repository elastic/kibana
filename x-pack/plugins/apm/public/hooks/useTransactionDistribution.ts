/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadTransactionDistribution } from '../services/rest/apm/transaction_groups';
import { IUrlParams } from '../context/UrlParamsContext/types';
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
    start,
    end,
    transactionType,
    transactionId,
    traceId,
    transactionName,
    kuery
  } = urlParams;

  const { data = INITIAL_DATA, status, error } = useFetcher(
    () => {
      if (serviceName && start && end && transactionType && transactionName) {
        return loadTransactionDistribution({
          serviceName,
          start,
          end,
          transactionType,
          transactionName,
          transactionId,
          traceId,
          kuery
        });
      }
    },
    [
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      kuery
    ]
  );

  return { data, status, error };
}
