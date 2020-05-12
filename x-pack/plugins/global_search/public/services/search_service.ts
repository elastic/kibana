/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, takeUntil } from 'rxjs/operators';
import { merge, Observable, timer } from 'rxjs';
import { duration } from 'moment';
import { HttpStart } from 'src/core/public';
import { takeInArray } from '../../common/operators';
import { GlobalSearchResultProvider } from '../types';
import { GlobalSearchConfigType } from '../config';
import { GlobalSearchBatchedResults, GlobalSearchFindOptions, GlobalSearchResult } from './types';
import { GlobalSearchProviderResult } from '../../common/types';
import { convertResultUrl } from '../../common/utils';

/** @public */
export interface SearchServiceSetup {
  registerResultProvider(provider: GlobalSearchResultProvider): void;
}

/** @public */
export interface SearchServiceStart {
  find(term: string, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
}

/** @internal */
export class SearchService {
  private readonly providers: GlobalSearchResultProvider[] = [];
  private config?: GlobalSearchConfigType;
  private http?: HttpStart;
  private readonly maxProviderResults = 20;

  setup({ config }: { config: GlobalSearchConfigType }): SearchServiceSetup {
    this.config = config;

    return {
      registerResultProvider: provider => {
        if (this.providers.map(p => p.id).includes(provider.id)) {
          throw new Error(`trying to register duplicate provider: ${provider.id}`);
        }
        this.providers.push(provider);
      },
    };
  }

  start({ http }: { http: HttpStart }): SearchServiceStart {
    this.http = http;

    return {
      find: (term, options) => this.performFind(term, options),
    };
  }

  private performFind(term: string, options: GlobalSearchFindOptions) {
    const timeout = duration(this.config!.search_timeout).asMilliseconds();
    const timeout$ = timer(timeout).pipe(map(() => undefined));
    const aborted$ = options.aborted$ ? merge(options.aborted$, timeout$) : timeout$;
    const providerOptions = {
      ...options,
      preference: options.preference ?? 'default_preference', // TODO: generate a value?
      maxResults: this.maxProviderResults,
      aborted$,
    };

    // TODO: perform server request

    const providersResults$ = this.providers.map(provider =>
      provider
        .find(term, providerOptions)
        .pipe(takeInArray(this.maxProviderResults), takeUntil(aborted$))
    );

    return merge(...providersResults$).pipe(
      map(results => ({
        results: results.map(r => this.processResult(r)),
      }))
    );
  }

  private processResult(providerResult: GlobalSearchProviderResult): GlobalSearchResult {
    return {
      ...providerResult,
      url: convertResultUrl(providerResult.url, this.http!.basePath),
      navigate: () => Promise.resolve(), // TODO: implements
    };
  }
}
