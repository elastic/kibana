/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { GlobalSearchProviderFindOptions, GlobalSearchProviderResult } from '../common/types';
import { SearchServiceSetup, SearchServiceStart } from './services';

export type GlobalSearchPluginSetup = Pick<SearchServiceSetup, 'registerResultProvider'>;
export type GlobalSearchPluginStart = Pick<SearchServiceStart, 'find'>;

/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchPluginSetup | global search API}
 */
export interface GlobalSearchResultProvider {
  /**
   * id of the provider
   */
  id: string;
  /**
   * Method that should return an observable used to emit new results from the provider.
   *
   * See {@GlobalSearchProviderResult | the result type} for the expected result structure.
   *
   * @example
   * ```ts
   * // returning all results in a single batch
   * setupDeps.globalSearch.registerResultProvider({
   *   id: 'my_provider',
   *   find: (term, { aborted$, preference, maxResults }, context) => {
   *     const resultPromise = myService.search(term, { preference, maxResults }, context.core.savedObjects.client);
   *     return from(resultPromise).pipe(takeUntil(aborted$));
   *   },
   * });
   * ```
   */
  find(
    term: string,
    options: GlobalSearchProviderFindOptions
  ): Observable<GlobalSearchProviderResult[]>;
}
