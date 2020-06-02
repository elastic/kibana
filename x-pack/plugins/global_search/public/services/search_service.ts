/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge, Observable, timer, throwError } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { duration } from 'moment';
import { HttpStart, ApplicationStart } from 'src/core/public';
import { GlobalSearchProviderResult } from '../../common/types';
import { GlobalSearchFindError } from '../../common/errors';
import { takeInArray } from '../../common/operators';
import { processProviderResult } from '../../common/process_result';
import { ILicenseChecker } from '../../common/license_checker';
import { GlobalSearchResultProvider } from '../types';
import { GlobalSearchClientConfigType } from '../config';
import { GlobalSearchBatchedResults, GlobalSearchFindOptions } from './types';
import { addNavigate, getDefaultPreference } from './utils';
import { fetchServerResults } from './fetch_server_results';

/** @public */
export interface SearchServiceSetup {
  registerResultProvider(provider: GlobalSearchResultProvider): void;
}

/** @public */
export interface SearchServiceStart {
  find(term: string, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
}

interface SetupDeps {
  config: GlobalSearchClientConfigType;
  maxProviderResults?: number;
}

interface StartDeps {
  http: HttpStart;
  application: ApplicationStart;
  licenseChecker: ILicenseChecker;
}

const defaultMaxProviderResults = 20;

/** @internal */
export class SearchService {
  private readonly providers = new Map<string, GlobalSearchResultProvider>();
  private config?: GlobalSearchClientConfigType;
  private http?: HttpStart;
  private application?: ApplicationStart;
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

  start({ http, application, licenseChecker }: StartDeps): SearchServiceStart {
    this.http = http;
    this.application = application;
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
          `GlobalSearch API is disabled because of invalid license state: ${licenseState.message}`
        )
      );
    }

    const timeout = duration(this.config!.search_timeout).asMilliseconds();
    const timeout$ = timer(timeout).pipe(map(() => undefined));
    const aborted$ = options.aborted$ ? merge(options.aborted$, timeout$) : timeout$;
    const preference = options.preference ?? getDefaultPreference();

    const providerOptions = {
      ...options,
      preference,
      maxResults: this.maxProviderResults,
      aborted$,
    };

    const navigateToUrl = this.application!.navigateToUrl;

    const processResult = (result: GlobalSearchProviderResult) =>
      addNavigate(processProviderResult(result, this.http!.basePath), navigateToUrl);

    const serverResults$ = fetchServerResults(this.http!, term, {
      preference,
      aborted$,
    }).pipe(map((results) => results.map((r) => addNavigate(r, navigateToUrl))));

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
