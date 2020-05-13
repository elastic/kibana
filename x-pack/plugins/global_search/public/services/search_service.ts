/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, takeUntil } from 'rxjs/operators';
import { merge, Observable, timer } from 'rxjs';
import { duration } from 'moment';
import { HttpStart, ApplicationStart } from 'src/core/public';
import { takeInArray } from '../../common/operators';
import { GlobalSearchResultProvider } from '../types';
import { GlobalSearchConfigType } from '../config';
import { GlobalSearchBatchedResults, GlobalSearchFindOptions } from './types';
import { getResultProcessor } from './process_result';

/** @public */
export interface SearchServiceSetup {
  registerResultProvider(provider: GlobalSearchResultProvider): void;
}

/** @public */
export interface SearchServiceStart {
  find(term: string, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
}

interface ServiceStartDeps {
  http: HttpStart;
  application: ApplicationStart;
}

/** @internal */
export class SearchService {
  private readonly providers: GlobalSearchResultProvider[] = [];
  private config?: GlobalSearchConfigType;
  private http?: HttpStart;
  private application?: ApplicationStart;
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

  start({ http, application }: ServiceStartDeps): SearchServiceStart {
    this.http = http;
    this.application = application;

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

    const processResult = getResultProcessor({
      basePath: this.http!.basePath,
      navigateToUrl: this.application!.navigateToUrl,
    });

    // TODO: perform server request

    const providersResults$ = this.providers.map(provider =>
      provider.find(term, providerOptions).pipe(
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
