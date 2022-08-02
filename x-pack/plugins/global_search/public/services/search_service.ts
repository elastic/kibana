/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, Observable, timer, throwError, EMPTY } from 'rxjs';
import { map, takeUntil, catchError } from 'rxjs/operators';
import { uniq } from 'lodash';
import { duration } from 'moment';
import { i18n } from '@kbn/i18n';
import { HttpStart } from '@kbn/core/public';
import {
  GlobalSearchFindParams,
  GlobalSearchProviderResult,
  GlobalSearchBatchedResults,
} from '../../common/types';
import { GlobalSearchFindError } from '../../common/errors';
import { takeInArray } from '../../common/operators';
import { defaultMaxProviderResults } from '../../common/constants';
import { processProviderResult } from '../../common/process_result';
import { ILicenseChecker } from '../../common/license_checker';
import { GlobalSearchResultProvider } from '../types';
import { GlobalSearchClientConfigType } from '../config';
import { GlobalSearchFindOptions } from './types';
import { getDefaultPreference } from './utils';
import { fetchServerResults } from './fetch_server_results';
import { fetchServerSearchableTypes } from './fetch_server_searchable_types';

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
   * startDeps.globalSearch.find({term: 'some term'}).subscribe({
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
  find(
    params: GlobalSearchFindParams,
    options: GlobalSearchFindOptions
  ): Observable<GlobalSearchBatchedResults>;

  /**
   * Returns all the searchable types registered by the underlying result providers.
   */
  getSearchableTypes(): Promise<string[]>;
}

interface SetupDeps {
  config: GlobalSearchClientConfigType;
  maxProviderResults?: number;
}

interface StartDeps {
  http: HttpStart;
  licenseChecker: ILicenseChecker;
}

const mapToUndefined = () => undefined;

/** @internal */
export class SearchService {
  private readonly providers = new Map<string, GlobalSearchResultProvider>();
  private config?: GlobalSearchClientConfigType;
  private http?: HttpStart;
  private maxProviderResults = defaultMaxProviderResults;
  private licenseChecker?: ILicenseChecker;
  private serverTypes?: string[];

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
      find: (params, options) => this.performFind(params, options),
      getSearchableTypes: () => this.getSearchableTypes(),
    };
  }

  private async getSearchableTypes() {
    const providerTypes = (
      await Promise.all(
        [...this.providers.values()].map((provider) => provider.getSearchableTypes())
      )
    ).flat();

    // only need to fetch from server once
    if (!this.serverTypes) {
      this.serverTypes = await fetchServerSearchableTypes(this.http!);
    }

    return uniq([...providerTypes, ...this.serverTypes]);
  }

  private performFind(params: GlobalSearchFindParams, options: GlobalSearchFindOptions) {
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

    const serverResults$ = fetchServerResults(this.http!, params, {
      preference,
      aborted$,
    }).pipe(catchError(() => EMPTY));

    const providersResults$ = [...this.providers.values()].map((provider) =>
      provider.find(params, providerOptions).pipe(
        catchError(() => EMPTY),
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
