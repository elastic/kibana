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
import { ProfilingTopNFunctionsLink } from '../../shared/profiling/top_functions/top_functions_link';

interface Props {
  serviceName: string;
  start: string;
  end: string;
  startIndex: number;
  endIndex: number;
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
}

export function ProfilingServiceTopNFunctions({
  serviceName,
  start,
  end,
  startIndex,
  endIndex,
  kuery,
  rangeFrom,
  rangeTo,
}: Props) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/functions',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              startIndex,
              endIndex,
              kuery,
            },
          },
        }
      );
    },
    [serviceName, start, end, startIndex, endIndex, kuery]
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
