/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, timer, merge } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { KibanaRequest, CoreStart, IBasePath } from 'src/core/server';
import {
  GlobalSearchResultProvider,
  getContextFactory,
  GlobalSearchContextFactory,
  GlobalSearchProviderResult,
} from '../result_provider';
import { GlobalSearchBatchedResults, GlobalSearchFindOptions, GlobalSearchResult } from './types';
import { takeFirstInArray } from './take_first_in_array';
import { convertResultUrl } from './utils';

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
  private basePath?: IBasePath;
  private contextFactory?: GlobalSearchContextFactory;

  setup({ basePath }: { basePath: IBasePath }): SearchServiceSetup {
    this.basePath = basePath;

    return {
      registerResultProvider: provider => {
        if (this.providers.map(p => p.id).includes(provider.id)) {
          throw new Error(`trying to register duplicate provider: ${provider.id}`);
        }
        this.providers.push(provider);
      },
    };
  }

  start(coreStart: CoreStart): SearchServiceStart {
    this.contextFactory = getContextFactory(coreStart);
    return {
      find: (term, options, request) => this.performFind(term, options, request),
    };
  }

  private performFind(term: string, options: GlobalSearchFindOptions, request: KibanaRequest) {
    const context = this.contextFactory!(request);

    const timeout$ = timer(1000).pipe(map(() => undefined)); // TODO: config property for timeout
    const aborted$ = options.aborted$ ? merge(options.aborted$, timeout$) : timeout$;
    const providerOptions = {
      ...options,
      preference: options.preference ?? 'default_preference', // TODO: generate a value?
      maxResults: 20, // TODO: config property or const?
      aborted$,
    };

    const providerObs$ = this.providers.map(provider =>
      provider.find(term, providerOptions, context).pipe(takeFirstInArray(20), takeUntil(aborted$))
    );

    return merge(...providerObs$).pipe(
      map(results => ({
        results: results.map(r => this.processResult(r)),
      }))
    );
  }

  private processResult(providerResult: GlobalSearchProviderResult): GlobalSearchResult {
    return {
      ...providerResult,
      url: convertResultUrl(providerResult.url, this.basePath!),
    };
  }
}
