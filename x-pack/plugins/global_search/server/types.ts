/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  GlobalSearchBatchedResults,
  GlobalSearchFindOptions,
  SearchServiceSetup,
  SearchServiceStart,
} from './services';

export type GlobalSearchPluginSetup = Pick<SearchServiceSetup, 'registerResultProvider'>;
export type GlobalSearchPluginStart = Pick<SearchServiceStart, 'find'>;

/**
 * globalSearch's route handler context
 *
 * @public
 */
export interface RouteHandlerGlobalSearchContext {
  find(term: string, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
}
