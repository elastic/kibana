/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESSearchResponse } from '@kbn/es-types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IInspectorInfo, isRunningResponse } from '@kbn/data-plugin/common';
import { getInspectResponse } from '../../common/features/alerts_and_slos';
import { FETCH_STATUS, useFetcher } from './use_fetcher';
import { useInspectorContext } from '../contexts/inspector/use_inspector_context';

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
            {
              legacyHitsTotal: false,
            }
          )
          .subscribe({
            next: (result) => {
              if (!isRunningResponse(result)) {
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
            error: (err) => {
              console.error(err);
              if (addInspectorRequest) {
                addInspectorRequest({
                  data: {
                    _inspect: [
                      getInspectResponse({
                        startTime,
                        esRequestParams: params,
                        esResponse: null,
                        esError: { originalError: err, name: err.name, message: err.message },
                        esRequestStatus: 2,
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
            },
          });
      });
    }
  }, [addInspectorRequest, data.search, name, params]);

  const { rawResponse } = response as any;

  return {
    data: rawResponse as ESSearchResponse<DocumentSource, TParams, { restTotalHitsAsInt: false }>,
    loading: Boolean(loading),
  };
};

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}
