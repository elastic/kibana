/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, timer, merge, throwError, EMPTY } from 'rxjs';
import { map, takeUntil, catchError } from 'rxjs/operators';
import { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import { KibanaRequest, CoreStart, IBasePath } from '@kbn/core/server';
import {
  GlobalSearchProviderResult,
  GlobalSearchBatchedResults,
  GlobalSearchFindParams,
} from '../../common/types';
import { GlobalSearchFindError } from '../../common/errors';
import { takeInArray } from '../../common/operators';
import { defaultMaxProviderResults } from '../../common/constants';
import { ILicenseChecker } from '../../common/license_checker';
import { processProviderResult } from '../../common/process_result';
import { GlobalSearchConfigType } from '../config';
import { getContextFactory, GlobalSearchContextFactory } from './context';
import { GlobalSearchResultProvider, GlobalSearchFindOptions } from '../types';
import { getRequestBasePath } from './utils';

/** @public */
export interface SearchServiceSetup {
  /**
   * Register a result provider to be used by the search service.
   *
   * @example
   * ```ts
   * setupDeps.globalSearch.registerResultProvider({
   *   id: 'my_provider',
   *   find: (term, options, context) => {
   *     const resultPromise = myService.search(term, options, context.core.savedObjects.client);
   *     return from(resultPromise).pipe(takeUntil(options.aborted$);
   *   },
   * });
   * ```
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
   * startDeps.globalSearch.find({ term: 'some term' }).subscribe({
   *  next: ({ results }) => {
   *   addNewResultsToList(results);
   *  },
   *  error: () => {},
   *  complete: () => {
   *   showAsyncSearchIndicator(false);
   * }
   * });
   * ```
   *
   * @remarks
   * - Emissions from the resulting observable will only contains **new** results. It is the consumer
   * responsibility to aggregate the emission and sort the results if required.
   * - Results from the client-side registered providers will not available when performing a search
   * from the server-side `find` API.
   */
  find(
    params: GlobalSearchFindParams,
    options: GlobalSearchFindOptions,
    request: KibanaRequest
  ): Observable<GlobalSearchBatchedResults>;

  /**
   * Returns all the searchable types registered by the underlying result providers.
   */
  getSearchableTypes(request: KibanaRequest): Promise<string[]>;
}

interface SetupDeps {
  basePath: IBasePath;
  config: GlobalSearchConfigType;
  maxProviderResults?: number;
}

interface StartDeps {
  core: CoreStart;
  licenseChecker: ILicenseChecker;
}

const mapToUndefined = () => undefined;

/** @internal */
export class SearchService {
  private readonly providers = new Map<string, GlobalSearchResultProvider>();
  private basePath?: IBasePath;
  private config?: GlobalSearchConfigType;
  private contextFactory?: GlobalSearchContextFactory;
  private licenseChecker?: ILicenseChecker;
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
      registerResultProvider: (provider) => {
        if (this.providers.has(provider.id)) {
          throw new Error(`trying to register duplicate provider: ${provider.id}`);
        }
        this.providers.set(provider.id, provider);
      },
    };
  }

  start({ core, licenseChecker }: StartDeps): SearchServiceStart {
    this.licenseChecker = licenseChecker;
    this.contextFactory = getContextFactory(core);
    return {
      find: (params, options, request) => this.performFind(params, options, request),
      getSearchableTypes: (request) => this.getSearchableTypes(request),
    };
  }

  private async getSearchableTypes(request: KibanaRequest) {
    const context = this.contextFactory!(request);
    const allTypes = (
      await Promise.all(
        [...this.providers.values()].map((provider) => provider.getSearchableTypes(context))
      )
    ).flat();
    return uniq(allTypes);
  }

  private performFind(
    params: GlobalSearchFindParams,
    options: GlobalSearchFindOptions,
    request: KibanaRequest
  ) {
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

    const context = this.contextFactory!(request);
    const basePath = getRequestBasePath(request, this.basePath!);

    const timeout$ = timer(this.config!.search_timeout.asMilliseconds()).pipe(map(mapToUndefined));
    const aborted$ = options.aborted$ ? merge(options.aborted$, timeout$) : timeout$;
    const findOptions = {
      ...options,
      preference: options.preference ?? 'default',
      maxResults: this.maxProviderResults,
      aborted$,
    };

    const processResult = (result: GlobalSearchProviderResult) =>
      processProviderResult(result, basePath);

    const providersResults$ = [...this.providers.values()].map((provider) =>
      provider.find(params, findOptions, context).pipe(
        catchError(() => EMPTY),
        takeInArray(this.maxProviderResults),
        takeUntil(aborted$),
        map((results) => results.map((r) => processResult(r)))
      )
    );

    return merge(...providersResults$).pipe(
      map((results) => ({
        results,
      }))
    );
  }
}
