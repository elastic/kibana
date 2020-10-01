/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { throwError, EMPTY, timer, from, Subscription } from 'rxjs';
import { mergeMap, expand, takeUntil, finalize, catchError } from 'rxjs/operators';
import {
  SearchInterceptor,
  SearchInterceptorDeps,
  UI_SETTINGS,
} from '../../../../../src/plugins/data/public';
import { isErrorResponse, isCompleteResponse } from '../../../../../src/plugins/data/public';
import { AbortError, toPromise } from '../../../../../src/plugins/data/common';
import { TimeoutErrorMode } from '../../../../../src/plugins/data/public';
import { IAsyncSearchOptions } from '.';
import { IAsyncSearchRequest, ENHANCED_ES_SEARCH_STRATEGY } from '../../common';

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

    const { combinedSignal, timeoutSignal, cleanup } = this.setupAbortSignal({
      abortSignal: options.abortSignal,
      timeout: this.searchTimeout,
    });
    const aborted$ = from(toPromise(combinedSignal));
    const strategy = options?.strategy || ENHANCED_ES_SEARCH_STRATEGY;

    this.pendingCount$.next(this.pendingCount$.getValue() + 1);

    return this.runSearch(request, combinedSignal, strategy).pipe(
      expand((response) => {
        // If the response indicates of an error, stop polling and complete the observable
        if (isErrorResponse(response)) {
          return throwError(new AbortError());
        }

        // If the response indicates it is complete, stop polling and complete the observable
        if (isCompleteResponse(response)) {
          return EMPTY;
        }

        id = response.id;
        // Delay by the given poll interval
        return timer(pollInterval).pipe(
          // Send future requests using just the ID from the response
          mergeMap(() => {
            return this.runSearch({ ...request, id }, combinedSignal, strategy);
          })
        );
      }),
      takeUntil(aborted$),
      catchError((e: any) => {
        // If we haven't received the response to the initial request, including the ID, then
        // we don't need to send a follow-up request to delete this search. Otherwise, we
        // send the follow-up request to delete this search, then throw an abort error.
        if (id !== undefined) {
          this.deps.http.delete(`/internal/search/${strategy}/${id}`);
        }
        return throwError(this.handleSearchError(e, request, timeoutSignal, options?.abortSignal));
      }),
      finalize(() => {
        this.pendingCount$.next(this.pendingCount$.getValue() - 1);
        cleanup();
      })
    );
  }
}
