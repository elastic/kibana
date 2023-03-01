/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmDataSource } from '../../../../common/data_source';
import { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import { Environment } from '../../../../common/environment_rt';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';

export function useServiceTransactionSummaryFetcher({
  serviceName,
  rangeFrom,
  rangeTo,
  environment,
  transactionType,
  preferredTxSource,
}: {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  environment: Environment;
  transactionType: string;
  preferredTxSource: {
    bucketSizeInSeconds: number;
    source: ApmDataSource<ApmServiceTransactionDocumentType>;
  } | null;
}) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  return useFetcher(
    (callApmApi) => {
      if (
        !serviceName ||
        !preferredTxSource?.bucketSizeInSeconds ||
        !preferredTxSource?.source.documentType ||
        !preferredTxSource?.source.rollupInterval
      ) {
        return undefined;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/summary/transaction',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              start,
              end,
              environment,
              bucketSizeInSeconds: preferredTxSource.bucketSizeInSeconds,
              documentType: preferredTxSource.source.documentType,
              rollupInterval: preferredTxSource.source.rollupInterval,
              transactionType,
            },
          },
        }
      );
    },
    [
      serviceName,
      start,
      end,
      environment,
      preferredTxSource?.source.documentType,
      preferredTxSource?.source.rollupInterval,
      preferredTxSource?.bucketSizeInSeconds,
      transactionType,
    ]
  );
}
