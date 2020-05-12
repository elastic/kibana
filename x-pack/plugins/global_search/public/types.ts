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
  id: string;
  find(
    term: string,
    options: GlobalSearchProviderFindOptions
  ): Observable<GlobalSearchProviderResult[]>;
}
