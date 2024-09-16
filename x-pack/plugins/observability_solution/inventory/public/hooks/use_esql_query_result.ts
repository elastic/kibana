/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  AbortableAsyncState,
  useAbortableAsync,
} from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { EsqlQueryResult, runEsqlQuery } from '../util/run_esql_query';
import { useKibana } from './use_kibana';

export function useEsqlQueryResult({
  query,
  start,
  end,
  kqlFilter,
  dslFilter,
}: {
  query?: string;
  start?: number;
  end?: number;
  kqlFilter?: string;
  dslFilter?: QueryDslQueryContainer[];
}): AbortableAsyncState<EsqlQueryResult> {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  return useAbortableAsync(
    async ({ signal }) => {
      if (!query) {
        return undefined;
      }
      return runEsqlQuery({
        query,
        start,
        end,
        kqlFilter,
        dslFilter,
        signal,
        data,
      });
    },
    [query, start, end, kqlFilter, dslFilter, data]
  );
}
