/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { IKibanaSearchRequest } from '../../../../../../src/plugins/data/public';
import { AbortError } from '../../../../../../src/plugins/kibana_utils/public';
import { SearchStrategyError } from '../../../common/search_strategies/common/errors';
import { DataSearchRequestDescriptor, DataSearchResponseDescriptor } from './types';

export type ResponseProjection<RawResponse, Response> = (
  rawResponse: RawResponse
) => { data: Response; errors?: SearchStrategyError[] };

export const handleDataSearchResponse = <
  Request extends IKibanaSearchRequest,
  RawResponse,
  Response,
  InitialResponse
>(
  // these are ref objects so they can be changed without having to recreate a new pipeline
  initialResponseRef: { current: InitialResponse },
  projectResponseRef: { current: ResponseProjection<RawResponse, Response> }
) => ({
  abortController,
  options,
  request,
  response$,
}: DataSearchRequestDescriptor<Request, RawResponse>): Observable<
  DataSearchResponseDescriptor<Request, Response | InitialResponse>
> =>
  response$.pipe(
    map((response) => {
      const { data, errors = [] } = projectResponseRef.current(response.rawResponse);
      return {
        abortController,
        options,
        request,
        response: {
          data,
          errors,
          isPartial: response.isPartial ?? false,
          isRunning: response.isRunning ?? false,
          loaded: response.loaded,
          total: response.total,
        },
      };
    }),
    startWith({
      abortController,
      options,
      request,
      response: {
        data: initialResponseRef.current,
        errors: [],
        isPartial: true,
        isRunning: true,
        loaded: 0,
        total: undefined,
      },
    }),
    catchError((error) =>
      of({
        abortController,
        options,
        request,
        response: {
          data: initialResponseRef.current,
          errors: [
            error instanceof AbortError
              ? {
                  type: 'aborted' as const,
                }
              : {
                  type: 'generic' as const,
                  message: `${error.message ?? error}`,
                },
          ],
          isPartial: true,
          isRunning: false,
          loaded: 0,
          total: undefined,
        },
      })
    )
  );
