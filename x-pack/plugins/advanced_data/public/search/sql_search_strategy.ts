/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  ISearchContext,
  SYNC_SEARCH_STRATEGY,
  ISearchGeneric,
  TSearchStrategyProvider,
  ISearchStrategy,
} from '../../../../../src/plugins/data/public';

import { SQL_SEARCH_STRATEGY } from '../../common';
import { ISqlSearchResponse } from '../types';

export const sqlSearchStrategyProvider: TSearchStrategyProvider<typeof SQL_SEARCH_STRATEGY> = (
  context: ISearchContext,
  search: ISearchGeneric
): ISearchStrategy<typeof SQL_SEARCH_STRATEGY> => {
  return {
    search: (request, options) =>
      search(
        { ...request, serverStrategy: SQL_SEARCH_STRATEGY },
        options,
        SYNC_SEARCH_STRATEGY
      ) as Observable<ISqlSearchResponse>,
  };
};
