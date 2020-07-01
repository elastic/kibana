/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  ISavedObjectTypeRegistry,
  ILegacyScopedClusterClient,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from 'src/core/server';
import {
  GlobalSearchBatchedResults,
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderResult,
} from '../common/types';
import { SearchServiceSetup, SearchServiceStart } from './services';

export type GlobalSearchPluginSetup = Pick<SearchServiceSetup, 'registerResultProvider'>;
export type GlobalSearchPluginStart = Pick<SearchServiceStart, 'find'>;

/**
 * globalSearch route handler context.
 *
 * @public
 */
export interface RouteHandlerGlobalSearchContext {
  /**
   * See {@link SearchServiceStart.find | the find API}
   */
  find(term: string, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
}

/**
 * Context passed to server-side {@GlobalSearchResultProvider | result provider}'s `find` method.
 *
 * @public
 */
export interface GlobalSearchProviderContext {
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
      typeRegistry: ISavedObjectTypeRegistry;
    };
    elasticsearch: {
      legacy: {
        client: ILegacyScopedClusterClient;
      };
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
  };
}

/**
 * Options for the server-side {@link GlobalSearchPluginStart.find | find API}
 *
 * @public
 */
export interface GlobalSearchFindOptions {
  /**
   * A custom preference token associated with a search 'session' that should be used to get consistent scoring
   * when performing calls to ES. Can also be used as a 'session' token for providers returning data from elsewhere
   * than an elasticsearch cluster.
   * If not specified, a random token will be generated and used.
   */
  preference?: string;
  /**
   * Optional observable to notify that the associated `find` call should be canceled.
   * If/when provided and emitting, no further result emission will be performed and the result observable will be completed.
   */
  aborted$?: Observable<void>;
}

/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchPluginSetup | global search API}
 *
 * @public
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
    options: GlobalSearchProviderFindOptions,
    context: GlobalSearchProviderContext
  ): Observable<GlobalSearchProviderResult[]>;
}
