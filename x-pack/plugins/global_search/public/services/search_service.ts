/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge, Observable, timer, throwError } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { duration } from 'moment';
import { i18n } from '@kbn/i18n';
import { HttpStart } from 'src/core/public';
import { GlobalSearchProviderResult, GlobalSearchBatchedResults } from '../../common/types';
import { GlobalSearchFindError } from '../../common/errors';
import { takeInArray } from '../../common/operators';
import { processProviderResult } from '../../common/process_result';
import { ILicenseChecker } from '../../common/license_checker';
import { GlobalSearchResultProvider } from '../types';
import { GlobalSearchClientConfigType } from '../config';
import { GlobalSearchFindOptions } from './types';
import { getDefaultPreference } from './utils';
import { fetchServerResults } from './fetch_server_results';

/** @public */
export interface SearchServiceSetup {
  /**
   * Register a result provider to be used by the search service.
   *
   * @example
   * ```ts
   * setupDeps.globalSearch.registerResultProvider({
   *   id: 'my_provider',
   *   find: (term, options) => {
   *     const resultPromise = myService.search(term, options);
   *     return from(resultPromise).pipe(takeUntil(options.aborted$);
   *   },
   * });
   * ```
   *
   * @remarks
   * As results from providers registered from the client-side API will not be available from the server's `find` API,
   * registering result providers from the client should only be done when returning results that would not be retrievable
   * from the server-side. In any other situation, prefer registering your provider from the server-side instead.
   */
  registerResultProvider(provider: GlobalSearchResultProvider): void;
}

/** @public */
export interface SearchServiceStart {
  /**
   * Perform a search for given `term` and {@link GlobalSearchFindOptions | options}.
   *
   * @example
   * ```ts
   * startDeps.globalSearch.find('some term').subscribe({
   *  next: ({ results }) => {
   *   addNewResultsToList(results);
   *  },
   *  error: () => {},
   *  complete: () => {
   *   showAsyncSearchIndicator(false);
   *  }
   * });
   * ```
   *
   * @remarks
   * Emissions from the resulting observable will only contains **new** results. It is the consumer's
   * responsibility to aggregate the emission and sort the results if required.
   */
  find(term: string, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
}

interface SetupDeps {
  config: GlobalSearchClientConfigType;
  maxProviderResults?: number;
}

interface StartDeps {
  http: HttpStart;
  licenseChecker: ILicenseChecker;
}

const defaultMaxProviderResults = 20;
const mapToUndefined = () => undefined;

/** @internal */
export class SearchService {
  private readonly providers = new Map<string, GlobalSearchResultProvider>();
  private config?: GlobalSearchClientConfigType;
  private http?: HttpStart;
  private maxProviderResults = defaultMaxProviderResults;
  private licenseChecker?: ILicenseChecker;

  setup({ config, maxProviderResults = defaultMaxProviderResults }: SetupDeps): SearchServiceSetup {
    this.config = config;

    this.maxProviderResults = maxProviderResults;

    return {
      registerResultProvider: (provider) => {
        if (this.providers.has(provider.id)) {
          throw new Error(`trying to register duplicate provider: ${provider.id}`);
        }
        this.providers.set(provider.id, provider);
      },
    };
  }

  start({ http, licenseChecker }: StartDeps): SearchServiceStart {
    this.http = http;
    this.licenseChecker = licenseChecker;

    return {
      find: (term, options) => this.performFind(term, options),
    };
  }

  private performFind(term: string, options: GlobalSearchFindOptions) {
    const licenseState = this.licenseChecker!.getState();
    if (!licenseState.valid) {
      return throwError(
        GlobalSearchFindError.invalidLicense(
          i18n.translate('xpack.globalSearch.find.invalidLicenseError', {
            defaultMessage: `GlobalSearch API is disabled because of invalid license state: {errorMessage}`,
            values: { errorMessage: licenseState.message },
          })
        )
      );
    }

    const timeout = duration(this.config!.search_timeout).asMilliseconds();
    const timeout$ = timer(timeout).pipe(map(mapToUndefined));
    const aborted$ = options.aborted$ ? merge(options.aborted$, timeout$) : timeout$;
    const preference = options.preference ?? getDefaultPreference();

    const providerOptions = {
      ...options,
      preference,
      maxResults: this.maxProviderResults,
      aborted$,
    };

    const processResult = (result: GlobalSearchProviderResult) =>
      processProviderResult(result, this.http!.basePath);

    const serverResults$ = fetchServerResults(this.http!, term, {
      preference,
      aborted$,
    });

    const providersResults$ = [...this.providers.values()].map((provider) =>
      provider.find(term, providerOptions).pipe(
        takeInArray(this.maxProviderResults),
        takeUntil(aborted$),
        map((results) => results.map((r) => processResult(r)))
      )
    );

    return merge(...providersResults$, serverResults$).pipe(
      map((results) => ({
        results,
      }))
    );
  }
}
