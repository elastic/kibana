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
