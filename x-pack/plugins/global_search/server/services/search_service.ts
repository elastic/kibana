/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, timer, merge } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { KibanaRequest, CoreStart, IBasePath } from 'src/core/server';
import { GlobalSearchProviderResult } from '../../common/types';
import { takeInArray } from '../../common/operators';
import { processProviderResult } from '../../common/process_result';
import { GlobalSearchConfigType } from '../config';
import { getContextFactory, GlobalSearchContextFactory } from './context';
import { GlobalSearchResultProvider } from '../types';
import { GlobalSearchBatchedResults, GlobalSearchFindOptions } from './types';

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

interface SetupDeps {
  basePath: IBasePath;
  config: GlobalSearchConfigType;
  maxProviderResults?: number;
}

const defaultMaxProviderResults = 20;

/** @internal */
export class SearchService {
  private readonly providers: GlobalSearchResultProvider[] = [];
  private basePath?: IBasePath;
  private config?: GlobalSearchConfigType;
  private contextFactory?: GlobalSearchContextFactory;
  private maxProviderResults = defaultMaxProviderResults;

  setup({
    basePath,
    config,
    maxProviderResults = defaultMaxProviderResults,
  }: SetupDeps): SearchServiceSetup {
    this.basePath = basePath;
    this.config = config;
    this.maxProviderResults = maxProviderResults;

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

    const timeout$ = timer(this.config!.search_timeout.asMilliseconds()).pipe(map(() => undefined));
    const aborted$ = options.aborted$ ? merge(options.aborted$, timeout$) : timeout$;
    const providerOptions = {
      ...options,
      preference: options.preference ?? 'default_preference', // TODO: generate a value?
      maxResults: this.maxProviderResults,
      aborted$,
    };

    const processResult = (result: GlobalSearchProviderResult) =>
      processProviderResult(result, this.basePath!);

    const providersResults$ = this.providers.map(provider =>
      provider.find(term, providerOptions, context).pipe(
        takeInArray(this.maxProviderResults),
        takeUntil(aborted$),
        map(results => results.map(r => processResult(r)))
      )
    );

    return merge(...providersResults$).pipe(
      map(results => ({
        results,
      }))
    );
  }
}
