/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type {
  ISavedObjectTypeRegistry,
  IUiSettingsClient,
  SavedObjectsClientContract,
  Capabilities,
  IRouter,
  CustomRequestHandlerContext,
} from '@kbn/core/server';
import {
  GlobalSearchBatchedResults,
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderResult,
  GlobalSearchProviderFindParams,
  GlobalSearchFindParams,
} from '../common/types';
import { SearchServiceSetup, SearchServiceStart } from './services';

export type GlobalSearchPluginSetup = Pick<SearchServiceSetup, 'registerResultProvider'>;
export type GlobalSearchPluginStart = Pick<SearchServiceStart, 'find' | 'getSearchableTypes'>;

/**
 * @internal
 */
export type GlobalSearchRequestHandlerContext = CustomRequestHandlerContext<{
  globalSearch: RouteHandlerGlobalSearchContext;
}>;

/**
 * @internal
 */
export type GlobalSearchRouter = IRouter<GlobalSearchRequestHandlerContext>;
/**
 * globalSearch route handler context.
 *
 * @public
 */
export interface RouteHandlerGlobalSearchContext {
  /**
   * See {@link SearchServiceStart.find | the find API}
   */
  find(
    params: GlobalSearchFindParams,
    options: GlobalSearchFindOptions
  ): Observable<GlobalSearchBatchedResults>;
  /**
   * See {@link SearchServiceStart.getSearchableTypes | the getSearchableTypes API}
   */
  getSearchableTypes: () => Promise<string[]>;
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
    uiSettings: {
      client: IUiSettingsClient;
    };
    capabilities: Observable<Capabilities>;
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
   *   find: ({term, filters }, { aborted$, preference, maxResults }, context) => {
   *     const resultPromise = myService.search(term, { preference, maxResults }, context.core.savedObjects.client);
   *     return from(resultPromise).pipe(takeUntil(aborted$));
   *   },
   * });
   * ```
   */
  find(
    search: GlobalSearchProviderFindParams,
    options: GlobalSearchProviderFindOptions,
    context: GlobalSearchProviderContext
  ): Observable<GlobalSearchProviderResult[]>;

  /**
   * Method that should return all the possible {@link GlobalSearchProviderResult.type | type} of results that
   * this provider can return.
   */
  getSearchableTypes: (context: GlobalSearchProviderContext) => string[] | Promise<string[]>;
}
