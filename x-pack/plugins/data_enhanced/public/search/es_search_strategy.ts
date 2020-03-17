/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { CoreSetup } from '../../../../../src/core/public';
import { ES_SEARCH_STRATEGY, IEsSearchResponse } from '../../../../../src/plugins/data/common';
import { ISearch, getEsPreference, ISearchStrategy } from '../../../../../src/plugins/data/public';
import { IEnhancedEsSearchRequest, EnhancedSearchParams } from '../../common';
import { ASYNC_SEARCH_STRATEGY } from './async_search_strategy';
import { IAsyncSearchOptions } from './types';

export function enhancedEsSearchStrategyProvider(
  core: CoreSetup,
  asyncStrategy: ISearchStrategy<typeof ASYNC_SEARCH_STRATEGY>
) {
  const search: ISearch<typeof ES_SEARCH_STRATEGY> = (
    request: IEnhancedEsSearchRequest,
    options
  ) => {
    const params: EnhancedSearchParams = {
      ignoreThrottled: !core.uiSettings.get<boolean>('search:includeFrozen'),
      preference: getEsPreference(core.uiSettings),
      ...request.params,
    };
    request.params = params;

    const asyncOptions: IAsyncSearchOptions = { pollInterval: 0, ...options };

    return asyncStrategy.search(
      { ...request, serverStrategy: ES_SEARCH_STRATEGY },
      asyncOptions
    ) as Observable<IEsSearchResponse>;
  };

  return { search };
}
