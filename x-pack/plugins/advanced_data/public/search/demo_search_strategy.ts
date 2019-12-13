/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  TSearchStrategyProvider,
  ISearchStrategy,
  ISearchContext,
} from '../../../../../src/plugins/data/public';

import { ASYNC_DEMO_SEARCH_STRATEGY, ASYNC_SEARCH_STRATEGY } from '../../common';
import { IDemoDataRequest, IDemoDataResponse } from '../types';

export const demoClientSearchStrategyProvider: TSearchStrategyProvider<typeof ASYNC_DEMO_SEARCH_STRATEGY> = (
  context: ISearchContext,
  search
): ISearchStrategy<typeof ASYNC_DEMO_SEARCH_STRATEGY> => {
  return {
    search: (request, options) =>
      search(
        { ...request, serverStrategy: ASYNC_DEMO_SEARCH_STRATEGY },
        options,
        ASYNC_SEARCH_STRATEGY
      ) as Observable<IDemoDataResponse>,
  };
};
