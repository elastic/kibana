/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { KibanaRequest } from 'src/core/server';
import { GlobalSearchResultProvider } from '../result_provider';
import { GlobalSearchBatchedResults, GlobalSearchFindOptions } from './types';
import { performFind } from './perform_find';

/** @public */
export interface SearchServiceSetup {
  registerResultProvider(provider: GlobalSearchResultProvider): void;
}

/** @public */
export interface SearchServiceStart {
  find(
    term: string,
    options: GlobalSearchFindOptions,
    request: KibanaRequest
  ): Observable<GlobalSearchBatchedResults>;
}

/** @internal */
export class SearchService {
  private readonly providers: GlobalSearchResultProvider[] = [];

  setup(): SearchServiceSetup {
    return {
      registerResultProvider: provider => {
        if (this.providers.map(p => p.id).includes(provider.id)) {
          throw new Error(`trying to register duplicate provider: ${provider.id}`);
        }
        this.providers.push(provider);
      },
    };
  }

  start(): SearchServiceStart {
    return {
      find: (term, options, request) => {
        return performFind({
          providers: this.providers,
          term,
          options,
          request,
        });
      },
    };
  }
}
