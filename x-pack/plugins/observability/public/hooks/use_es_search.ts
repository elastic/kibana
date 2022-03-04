/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { IInspectorInfo, isCompleteResponse } from '../../../../../src/plugins/data/common';
import { FETCH_STATUS, useFetcher } from './use_fetcher';
import { useInspectorContext } from '../context/inspector/use_inspector_context';
import { getInspectResponse } from '../../common/utils/get_inspect_response';

export const useEsSearch = <DocumentSource extends unknown, TParams extends estypes.SearchRequest>(
  params: TParams,
  fnDeps: any[],
  options: { inspector?: IInspectorInfo; name: string }
) => {
  const {
    services: { data },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { name } = options ?? {};

  const { addInspectorRequest } = useInspectorContext();

  const { data: response = {}, loading } = useFetcher(() => {
    if (params.index) {
      const startTime = Date.now();
      return new Promise((resolve) => {
        const search$ = data.search
          .search(
            {
              params,
            },
            {}
          )
          .subscribe({
            next: (result) => {
              if (isCompleteResponse(result)) {
                if (addInspectorRequest) {
                  addInspectorRequest({
                    data: {
                      _inspect: [
                        getInspectResponse({
                          startTime,
                          esRequestParams: params,
                          esResponse: result.rawResponse,
                          esError: null,
                          esRequestStatus: 1,
                          operationName: name,
                          kibanaRequest: {
                            route: {
                              path: '/internal/bsearch',
                              method: 'POST',
                            },
                          } as any,
                        }),
                      ],
                    },
                    status: FETCH_STATUS.SUCCESS,
                  });
                }
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
