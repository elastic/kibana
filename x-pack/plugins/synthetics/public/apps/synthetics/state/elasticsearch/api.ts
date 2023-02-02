/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '@kbn/data-plugin/common';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESSearchResponse } from '@kbn/es-types';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';
import { getInspectResponse } from '@kbn/observability-plugin/common';
import { kibanaService } from '../../../../utils/kibana_service';
import { apiService } from '../../../../utils/api_service';

export const executeEsQueryAPI = async ({
  params,
  name,
}: {
  params: estypes.SearchRequest;
  name: string;
}) => {
  const data = kibanaService.startPlugins.data;

  const addInspectorRequest = apiService.addInspectorRequest;

  const response = new Promise<IKibanaSearchResponse>((resolve, reject) => {
    const startTime = Date.now();

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
        error: (err) => {
          if (isErrorResponse(err)) {
            // eslint-disable-next-line no-console
            console.error(err);
            reject(err);
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
          }
        },
      });
  });

  const { rawResponse } = await response;
  return { result: rawResponse as ESSearchResponse, name };
};
