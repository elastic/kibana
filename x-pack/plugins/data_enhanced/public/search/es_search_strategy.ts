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
  SYNC_SEARCH_STRATEGY,
  getEsPreference,
} from '../../../../../src/plugins/data/public';
import { IEnhancedEsSearchRequest, EnhancedSearchParams } from '../../common';

export const enhancedEsSearchStrategyProvider: TSearchStrategyProvider<typeof ES_SEARCH_STRATEGY> = (
  context: ISearchContext
) => {
  const syncStrategyProvider = context.getSearchStrategy(SYNC_SEARCH_STRATEGY);
  const { search: syncSearch } = syncStrategyProvider(context);

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

    return syncSearch({ ...request, serverStrategy: ES_SEARCH_STRATEGY }, options) as Observable<
      IEsSearchResponse
    >;
  };

  return { search };
};
