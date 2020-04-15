/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { ES_SEARCH_STRATEGY, IEsSearchResponse } from '../../../../../src/plugins/data/common';
import {
  TSearchStrategyProvider,
  ISearchContext,
  ISearch,
  getEsPreference,
} from '../../../../../src/plugins/data/public';
import { IEnhancedEsSearchRequest, EnhancedSearchParams } from '../../common';
import { ASYNC_SEARCH_STRATEGY } from './async_search_strategy';
import { IAsyncSearchOptions } from './types';

export const enhancedEsSearchStrategyProvider: TSearchStrategyProvider<typeof ES_SEARCH_STRATEGY> = (
  context: ISearchContext
) => {
  const asyncStrategyProvider = context.getSearchStrategy(ASYNC_SEARCH_STRATEGY);
  const { search: asyncSearch } = asyncStrategyProvider(context);

  const search: ISearch<typeof ES_SEARCH_STRATEGY> = (
    request: IEnhancedEsSearchRequest,
    options
  ) => {
    const params: EnhancedSearchParams = {
      ignoreThrottled: !context.core.uiSettings.get<boolean>('search:includeFrozen'),
      preference: getEsPreference(context.core.uiSettings),
      ...request.params,
    };
    request.params = params;

    const asyncOptions: IAsyncSearchOptions = { pollInterval: 0, ...options };

    return asyncSearch(
      { ...request, serverStrategy: ES_SEARCH_STRATEGY },
      asyncOptions
    ) as Observable<IEsSearchResponse>;
  };

  return { search };
};
