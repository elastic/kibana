/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { ES_SEARCH_STRATEGY, IEsSearchResponse } from '../../../../../../src/plugins/data/common';
import { ASYNC_SEARCH_STRATEGY } from '../async_search_strategy';
import {
  TSearchStrategyProvider,
  ISearchStrategy,
  ISearchContext,
} from '../../../../../../src/plugins/data/public';

export const enhancedEsSearchStrategyProvider: TSearchStrategyProvider<typeof ES_SEARCH_STRATEGY> = (
  context: ISearchContext
): ISearchStrategy<typeof ES_SEARCH_STRATEGY> => {
  const asyncStrategyProvider = context.getSearchStrategy(ASYNC_SEARCH_STRATEGY);
  const { search } = asyncStrategyProvider(context);
  return {
    search: (request, options) => {
      const params = {
        ignoreThrottled: !context.core.uiSettings.get<boolean>('search:includeFrozen'),
        ...request.params,
      };
      return search(
        {
          ...request,
          params,
          serverStrategy: ES_SEARCH_STRATEGY,
        },
        options,
        ASYNC_SEARCH_STRATEGY
      ) as Observable<IEsSearchResponse>;
    },
  };
};
