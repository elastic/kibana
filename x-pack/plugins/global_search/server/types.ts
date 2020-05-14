/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  ISavedObjectTypeRegistry,
  IScopedClusterClient,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from 'src/core/server';
import {
  GlobalSearchResult,
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderResult,
} from '../common/types';
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

/**
 * Context passed to server-side {@GlobalSearchResultProvider | result provider}'s `find` method.
 */
export interface GlobalSearchProviderContext {
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
      typeRegistry: ISavedObjectTypeRegistry;
    };
    elasticsearch: {
      legacy: {
        client: IScopedClusterClient;
      };
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
  };
}

/**
 * Options for the server-side {@link GlobalSearchServiceStart.find | find API}
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
   * If/when provided and emitting, the result observable will be completed and no further result emission will be performed.
   */
  aborted$?: Observable<void>;
}
/**
 * Response returned from the server-side {@link GlobalSearchServiceStart | global search service}'s `find` API
 */
export interface GlobalSearchBatchedResults {
  /**
   * Results for this batch
   */
  results: GlobalSearchResult[];
}

/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchPluginSetup | global search API}
 */
export interface GlobalSearchResultProvider {
  id: string;
  find(
    term: string,
    options: GlobalSearchProviderFindOptions,
    context: GlobalSearchProviderContext
  ): Observable<GlobalSearchProviderResult[]>;
}
