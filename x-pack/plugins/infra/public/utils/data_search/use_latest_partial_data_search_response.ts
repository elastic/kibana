/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { useOperator } from '../use_observable';
import { flattenDataSearchResponseDescriptor } from './flatten_data_search_response';
import { ParsedDataSearchRequestDescriptor, ParsedDataSearchResponseDescriptor } from './types';
import { useDataSearchResponseState } from './use_data_search_response_state';

export const useLatestPartialDataSearchResponse = <Request extends IKibanaSearchRequest, Response>(
  requests$: Observable<ParsedDataSearchRequestDescriptor<Request, Response>>
) => {
  const latestResponse$: Observable<ParsedDataSearchResponseDescriptor<Request, Response>> =
    useOperator(requests$, flattenLatestDataSearchResponse);

  const {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    latestResponseData,
    latestResponseErrors,
    loaded,
    total,
  } = useDataSearchResponseState(latestResponse$);

  return {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    latestResponseData,
    latestResponseErrors,
    loaded,
    total,
  };
};

const flattenLatestDataSearchResponse = switchMap(flattenDataSearchResponseDescriptor);
