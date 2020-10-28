/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { throwError, from, Subscription } from 'rxjs';
import { tap, takeUntil, finalize, catchError } from 'rxjs/operators';
import {
  IEsSearchResponse,
  SearchInterceptor,
  SearchInterceptorDeps,
  UI_SETTINGS,
} from '../../../../../src/plugins/data/public';
import { isErrorResponse, isCompleteResponse } from '../../../../../src/plugins/data/public';
import { AbortError, toPromise } from '../../../../../src/plugins/data/common';
import { TimeoutErrorMode } from '../../../../../src/plugins/data/public';
import {
  IAsyncSearchRequest,
  ENHANCED_ES_SEARCH_STRATEGY,
  IAsyncSearchOptions,
} from '../../common';

import { doPartialSearch } from '../../common/search/es_search/es_search_rxjs_utils';

export class EnhancedSearchInterceptor extends SearchInterceptor {
  private uiSettingsSub: Subscription;
  private searchTimeout: number;

  /**
   * @internal
   */
  constructor(deps: SearchInterceptorDeps) {
    super(deps);
    this.searchTimeout = deps.uiSettings.get(UI_SETTINGS.SEARCH_TIMEOUT);

    this.uiSettingsSub = deps.uiSettings
      .get$(UI_SETTINGS.SEARCH_TIMEOUT)
      .subscribe((timeout: number) => {
        this.searchTimeout = timeout;
      });
  }

  public stop() {
    this.uiSettingsSub.unsubscribe();
  }

  protected getTimeoutMode() {
    return this.application.capabilities.advancedSettings?.save
      ? TimeoutErrorMode.CHANGE
      : TimeoutErrorMode.CONTACT;
  }

  /**
   * Abort our `AbortController`, which in turn aborts any intercepted searches.
   */
  public cancelPending = () => {
    this.abortController.abort();
    this.abortController = new AbortController();
    if (this.deps.usageCollector) this.deps.usageCollector.trackQueriesCancelled();
  };

  public search(
    request: IAsyncSearchRequest,
    { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
  ) {
    const { id } = request;

    const { combinedSignal, timeoutSignal, cleanup } = this.setupAbortSignal({
      abortSignal: options.abortSignal,
      timeout: this.searchTimeout,
    });
    const aborted$ = from(toPromise(combinedSignal));
    const strategy = options?.strategy || ENHANCED_ES_SEARCH_STRATEGY;

    this.pendingCount$.next(this.pendingCount$.getValue() + 1);

    return doPartialSearch<IEsSearchResponse>(
      () => this.runSearch(request, combinedSignal, strategy),
      (requestId) => this.runSearch({ ...request, id: requestId }, combinedSignal, strategy),
      isCompleteResponse,
      (response) => response.id,
      id,
      { pollInterval }
    ).pipe(
      tap((r) => {
        // If the response indicates of an error, stop polling and complete the observable
        if (isErrorResponse(r)) {
          return throwError(new AbortError());
        }
      }),
      takeUntil(aborted$),
      catchError((e: any) => {
        // If we haven't received the response to the initial request, including the ID, then
        // we don't need to send a follow-up request to delete this search. Otherwise, we
        // send the follow-up request to delete this search, then throw an abort error.
        if (id !== undefined) {
          this.deps.http.delete(`/internal/search/${strategy}/${id}`);
        }
        return throwError(this.handleSearchError(e, request, timeoutSignal, options));
      }),
      finalize(() => {
        this.pendingCount$.next(this.pendingCount$.getValue() - 1);
        cleanup();
      })
    );
  }
}
