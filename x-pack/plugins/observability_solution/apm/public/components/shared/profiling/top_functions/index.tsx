/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ProfilingTopNFunctionsLink } from './top_functions_link';

interface Props {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  transactionName?: string;
  transactionType?: string;
  environment: string;
}

export function ProfilingTopNFunctions({
  serviceName,
  rangeFrom,
  rangeTo,
  kuery,
  transactionName,
  transactionType,
  environment,
}: Props) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (transactionType) {
        return callApmApi('GET /internal/apm/services/{serviceName}/profiling/functions', {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              kuery,
              transactionName,
              startIndex: 0,
              endIndex: 10,
              transactionType,
              environment,
            },
          },
        });
      }
    },
    [serviceName, start, end, kuery, transactionName, transactionType, environment]
  );

  return (
    <>
      <ProfilingTopNFunctionsLink
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        justifyContent="flexEnd"
      />
      <EuiSpacer />
      <EmbeddableFunctions
        data={data}
        isLoading={isPending(status)}
        rangeFrom={new Date(start).valueOf()}
        rangeTo={new Date(end).valueOf()}
      />
    </>
  );
}
