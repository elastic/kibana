/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from './use_kibana';

export function useEsqlQueryResult({
  query,
  kuery,
  start,
  end,
  operationName,
  dslFilter,
}: {
  query?: string;
  kuery?: string;
  start: number;
  end: number;
  operationName: string;
  dslFilter?: QueryDslQueryContainer[];
}) {
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  return useAbortableAsync(
    ({ signal }) => {
      if (!query) {
        return undefined;
      }
      return inventoryAPIClient.fetch('POST /internal/inventory/esql', {
        signal,
        params: {
          body: {
            query,
            start,
            end,
            kuery: kuery ?? '',
            operationName,
            dslFilter,
          },
        },
      });
    },
    [inventoryAPIClient, query, start, end, kuery, operationName, dslFilter]
  );
}
