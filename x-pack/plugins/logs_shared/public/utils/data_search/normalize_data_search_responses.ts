/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/public';
import { SearchStrategyError } from '../../../common/search_strategies/common/errors';
import { ParsedKibanaSearchResponse } from './types';

export type RawResponseParser<RawResponse, Response> = (rawResponse: RawResponse) => {
  data: Response;
  errors?: SearchStrategyError[];
};

/**
 * An operator factory that normalizes each {@link IKibanaSearchResponse} by
 * parsing it into a {@link ParsedKibanaSearchResponse} and adding initial
 * responses and error handling.
 *
 * @param initialResponse - The initial value to emit when a new request is
 * handled.
 * @param projectResponse - The projection function to apply to each response
 * payload. It should validate that the response payload is of the type {@link
 * RawResponse} and decode it to a {@link Response}.
 *
 * @return An operator that adds parsing and error handling transformations to
 * each response payload using the arguments given above.
 */
export const normalizeDataSearchResponses =
  <RawResponse, Response, InitialResponse>(
    initialResponse: InitialResponse,
    parseRawResponse: RawResponseParser<RawResponse, Response>
  ) =>
  (
    response$: Observable<IKibanaSearchResponse<RawResponse>>
  ): Observable<ParsedKibanaSearchResponse<Response | InitialResponse>> =>
    response$.pipe(
      map((response) => {
        const { data, errors = [] } = parseRawResponse(response.rawResponse);
        return {
          data,
          errors,
          isPartial: response.isPartial ?? false,
          isRunning: response.isRunning ?? false,
          loaded: response.loaded,
          total: response.total,
        };
      }),
      startWith({
        data: initialResponse,
        errors: [],
        isPartial: true,
        isRunning: true,
        loaded: 0,
        total: undefined,
      }),
      catchError((error) =>
        of({
          data: initialResponse,
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
        })
      )
    );
