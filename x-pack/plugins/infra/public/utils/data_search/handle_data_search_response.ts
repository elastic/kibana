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

/**
 * Turns the {@link DataSearchRequestDescriptor} into a {@link
 * DataSearchResponseDescriptor} by decoding or validating and unrolling the
 * partial and final responses emitted.
 *
 * Since the parameters are refs they will be used immediately for the next
 * response without the need to recreate the pipeline.
 *
 *
 * @param initialResponseRef - A ref object containing the initial value to
 * emit when a new request is handled. *
 * @param projectResponseRef - A ref object containing the projection function
 * to apply to each response payload. It should validate that the response
 * payload is of the type {@link RawResponse} and decode it to a {@link
 * Response}.
 *
 * @return A function that decodes and validates each response payload using
 * the arguments given above.
 */
export const handleDataSearchResponse = <
  Request extends IKibanaSearchRequest,
  RawResponse,
  Response,
  InitialResponse
>(
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
