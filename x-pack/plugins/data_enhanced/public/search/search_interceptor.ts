/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { throwError, from, Subscription } from 'rxjs';
import { tap, takeUntil, finalize, catchError } from 'rxjs/operators';
import {
  TimeoutErrorMode,
  IEsSearchResponse,
  SearchInterceptor,
  SearchInterceptorDeps,
  UI_SETTINGS,
} from '../../../../../src/plugins/data/public';
import { AbortError, abortSignalToPromise } from '../../../../../src/plugins/kibana_utils/public';

import {
  IAsyncSearchRequest,
  ENHANCED_ES_SEARCH_STRATEGY,
  IAsyncSearchOptions,
  doPartialSearch,
  throwOnEsError,
} from '../../common';

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
    let { id } = request;

    const { combinedSignal, timeoutSignal, cleanup, abort } = this.setupAbortSignal({
      abortSignal: options.abortSignal,
      timeout: this.searchTimeout,
    });
    const abortedPromise = abortSignalToPromise(combinedSignal);
    const strategy = options?.strategy ?? ENHANCED_ES_SEARCH_STRATEGY;

    this.pendingCount$.next(this.pendingCount$.getValue() + 1);

    const isCurrentSession =
      options.sessionId && options.sessionId === this.deps.session.getSessionId();

    const untrackSearch = isCurrentSession && this.deps.session.trackSearch({ abort });

    return doPartialSearch<IEsSearchResponse>(
      () => this.runSearch(request, { ...options, strategy, abortSignal: combinedSignal }),
      (requestId) =>
        this.runSearch(
          { ...request, id: requestId },
          { ...options, strategy, abortSignal: combinedSignal }
        ),
      (r) => !r.isRunning,
      (response) => response.id,
      id,
      { pollInterval }
    ).pipe(
      tap((r) => {
        id = r.id ?? id;
      }),
      throwOnEsError(),
      takeUntil(from(abortedPromise.promise)),
      catchError((e: AbortError) => {
        if (id) {
          this.deps.http.delete(`/internal/search/${strategy}/${id}`);
        }

        return throwError(this.handleSearchError(e, request, timeoutSignal, options));
      }),
      finalize(() => {
        this.pendingCount$.next(this.pendingCount$.getValue() - 1);
        cleanup();
        abortedPromise.cleanup();
        if (untrackSearch) {
          untrackSearch();
        }
      })
    );
  }
}
