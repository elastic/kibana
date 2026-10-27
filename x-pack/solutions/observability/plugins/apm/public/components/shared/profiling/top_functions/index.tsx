/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import type { ProfilingSchema } from '@kbn/profiling-utils';
import React, { useEffect } from 'react';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
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
  /** Rendered instead of the functions table when the service's transactions link to no profiling samples. */
  fallback?: React.ReactNode;
  /** Called once when the fallback first renders, so the parent can switch its schema selector. */
  onFallback?: () => void;
  /** Undefined until a schema is selected, which the request waits for */
  schema?: ProfilingSchema;
}

export function ProfilingTopNFunctions({
  serviceName,
  rangeFrom,
  rangeTo,
  kuery,
  transactionName,
  transactionType,
  environment,
  fallback,
  onFallback,
  schema,
}: Props) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (transactionType && schema) {
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
              schema,
            },
          },
        });
      }
    },
    [serviceName, start, end, kuery, transactionName, transactionType, environment, schema]
  );

  const isFallback =
    Boolean(fallback) && status === FETCH_STATUS.SUCCESS && (!data || data.TotalCount === 0);

  useEffect(() => {
    if (isFallback) {
      onFallback?.();
    }
  }, [isFallback, onFallback]);

  if (isFallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <ProfilingTopNFunctionsLink
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        schema={schema}
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
