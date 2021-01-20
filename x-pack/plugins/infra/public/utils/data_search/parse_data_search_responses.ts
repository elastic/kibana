/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { IKibanaSearchRequest } from '../../../../../../src/plugins/data/public';
import { AbortError } from '../../../../../../src/plugins/kibana_utils/public';
import { SearchStrategyError } from '../../../common/search_strategies/common/errors';
import { DataSearchRequestDescriptor, ParsedDataSearchRequestDescriptor } from './types';

export type ResponseProjection<RawResponse, Response> = (
  rawResponse: RawResponse
) => { data: Response; errors?: SearchStrategyError[] };

/**
 * Turns the {@link DataSearchRequestDescriptor} into a {@link
 * ParsedDataSearchRequestDescriptor} by enhancing the response observable with
 * parsing and error handling transformations.
 *
 * @param initialResponse - The initial value to emit when a new request is
 * handled.
 * @param projectResponse - The projection function to apply to each response
 * payload. It should validate that the response payload is of the type {@link
 * RawResponse} and decode it to a {@link Response}.
 *
 * @return A function that adds parsing and error handling transformations to
 * each response payload using the arguments given above.
 */
export const parseDataSearchResponses = <
  Request extends IKibanaSearchRequest,
  RawResponse,
  Response,
  InitialResponse
>(
  initialResponse: InitialResponse,
  projectResponse: ResponseProjection<RawResponse, Response>
) => (
  requestDescriptor: DataSearchRequestDescriptor<Request, RawResponse>
): ParsedDataSearchRequestDescriptor<Request, Response | InitialResponse> => ({
  ...requestDescriptor,
  response$: requestDescriptor.response$.pipe(
    map((response) => {
      const { data, errors = [] } = projectResponse(response.rawResponse);
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
  ),
});
