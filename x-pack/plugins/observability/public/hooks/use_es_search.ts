/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { isCompleteResponse } from '../../../../../src/plugins/data/common';
import { useFetcher } from './use_fetcher';

export const useEsSearch = <DocumentSource extends unknown, TParams extends estypes.SearchRequest>(
  params: TParams,
  fnDeps: any[]
) => {
  const {
    services: { data },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data: response = {}, loading } = useFetcher(() => {
    if (params.index) {
      return new Promise((resolve) => {
        const search$ = data.search
          .search({
            params,
          })
          .subscribe({
            next: (result) => {
              if (isCompleteResponse(result)) {
                // Final result
                resolve(result);
                search$.unsubscribe();
              }
            },
          });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...fnDeps]);

  const { rawResponse } = response as any;

  return { data: rawResponse as ESSearchResponse<DocumentSource, TParams>, loading };
};

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}
