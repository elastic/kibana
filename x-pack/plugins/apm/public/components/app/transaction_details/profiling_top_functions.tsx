/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ProfilingTopNFunctionsLink } from '../../shared/profiling/top_functions/top_functions_link';

interface Props {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  transactionName: string;
}

export function ProfilingTopNFunctions({
  serviceName,
  rangeFrom,
  rangeTo,
  kuery,
  transactionName,
}: Props) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/transactions/functions',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              kuery,
              transactionName,
              startIndex: 0,
              endIndex: 10,
            },
          },
        }
      );
    },
    [serviceName, start, end, kuery, transactionName]
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ProfilingTopNFunctionsLink
          kuery={kuery}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        />
      </div>
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
