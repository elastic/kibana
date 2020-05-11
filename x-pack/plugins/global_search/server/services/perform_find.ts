/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { KibanaRequest } from 'src/core/server';
import { GlobalSearchResultProvider } from '../result_provider';
import { GlobalSearchBatchedResults, GlobalSearchFindOptions } from './types';

export const performFind = ({
  providers,
  term,
  options,
  request,
}: {
  providers: GlobalSearchResultProvider[];
  term: string;
  options: GlobalSearchFindOptions;
  request: KibanaRequest;
}): Observable<GlobalSearchBatchedResults> => {
  // TODO
  return null as any;
};
