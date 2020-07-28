/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, throwError, EMPTY, timer, from } from 'rxjs';
import { mergeMap, expand, takeUntil, finalize, tap } from 'rxjs/operators';
import { getLongQueryNotification } from './long_query_notification';
import { getBackgroundRunningNotification } from './background_running_notification';
import { SearchInterceptor, UI_SETTINGS } from '../../../../../src/plugins/data/public';
import { AbortError, toPromise } from '../../../../../src/plugins/data/common';
import { IAsyncSearchOptions } from '.';
import { EnhancedSearchInterceptorDeps } from './types';
import { IAsyncSearchRequest, IAsyncSearchResponse } from '../../common/search';

export class EnhancedSearchInterceptor extends SearchInterceptor {
  private isRestoreCache: Map<string, boolean> = new Map();

  /**
   * This class should be instantiated with a `requestTimeout` corresponding with how many ms after
   * requests are initiated that they should automatically cancel.
   * @param deps
   * @param requestTimeout Usually config value `elasticsearch.requestTimeout`
   */
  constructor(protected readonly deps: EnhancedSearchInterceptorDeps, requestTimeout?: number) {
    super(deps, requestTimeout);
  }

  /**
   * Abort our `AbortController`, which in turn aborts any intercepted searches.
   */
  public cancelPending = () => {
    this.hideToast();
    this.abortController.abort();
    this.abortController = new AbortController();
    if (this.deps.usageCollector) this.deps.usageCollector.trackQueriesCancelled();
  };

  /**
   * Un-schedule timing out all of the searches intercepted.
   */
  public runBeyondTimeout = async () => {
    this.hideToast();
    this.timeoutSubscriptions.unsubscribe();
    if (this.deps.usageCollector) this.deps.usageCollector.trackLongQueryRunBeyondTimeout();

    const stored = await this.deps.session.store();
    if (stored) {
      this.events$.next({
        name: 'background',
        sessionId: this.deps.session.get(),
      });
      this.deps.toasts.addInfo(
        {
          title: 'Background request has started',
          text: getBackgroundRunningNotification({
            viewRequests: () => {},
          }),
        },
        {
          toastLifeTimeMs: 1000000,
        }
      );
    }
  };

  private shouldNotifyLongRunning = async () => {
    const currentSessionId = this.deps.session.get();
    if (this.isRestoreCache.get(currentSessionId) !== undefined) return false;

    // set before await to avoid additional fetches
    this.isRestoreCache.set(currentSessionId, false);

    const bgSession = await this.deps.session.get();
    const isRestore = !bgSession;
    this.isRestoreCache.set(currentSessionId, isRestore);

    setTimeout(() => {
      this.isRestoreCache.delete(currentSessionId);
    }, 60000);

    return isRestore;
  };

  private showToastIfNewSession = async () => {
    if (await this.shouldNotifyLongRunning()) {
      if (this.longRunningToast) this.hideToast();
      this.longRunningToast = this.deps.toasts.addInfo(
        {
          title: 'Your query is taking awhile',
          text: getLongQueryNotification({
            cancel: this.cancelPending,
            runBeyondTimeout: this.runBeyondTimeout,
          }),
        },
        {
          toastLifeTimeMs: 1000000,
        }
      );
    }
  };

  protected showToast = () => {
    this.showToastIfNewSession();
    if (this.longRunningToast) return;
    this.longRunningToast = this.deps.toasts.addInfo(
      {
        title: 'Your query is taking awhile',
        text: getLongQueryNotification({
          cancel: this.cancelPending,
          runBeyondTimeout: this.runBeyondTimeout,
        }),
      },
      {
        toastLifeTimeMs: 1000000,
      }
    );
    if (this.deps.usageCollector) this.deps.usageCollector.trackLongQueryPopupShown();
  };

  public search(
    request: IAsyncSearchRequest,
    { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
  ): Observable<IAsyncSearchResponse> {
    let { id } = request;

    request.params = {
      ignoreThrottled: !this.deps.uiSettings.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
      ...request.params,
    };

    const { combinedSignal, cleanup } = this.setupTimers(options);
    const aborted$ = from(toPromise(combinedSignal));

    this.pendingCount$.next(++this.pendingCount);

    return (this.runSearch(request, combinedSignal) as Observable<IAsyncSearchResponse>).pipe(
      expand((response: IAsyncSearchResponse) => {
        // If the response indicates of an error, stop polling and complete the observable
        if (!response || (!response.is_running && response.is_partial)) {
          return throwError(new AbortError());
        }

        // If the response indicates it is complete, stop polling and complete the observable
        if (!response.is_running) {
          if (this.deps.usageCollector && response.rawResponse) {
            this.deps.usageCollector.trackSuccess(response.rawResponse.took);
          }
          return EMPTY;
        }

        id = response.id;
        // Delay by the given poll interval
        return timer(pollInterval).pipe(
          // Send future requests using just the ID from the response
          mergeMap(() => {
            return this.runSearch({ id }, combinedSignal) as Observable<IAsyncSearchResponse>;
          })
        );
      }),
      takeUntil(aborted$),
      tap({
        error: () => {
          // If we haven't received the response to the initial request, including the ID, then
          // we don't need to send a follow-up request to delete this search. Otherwise, we
          // send the follow-up request to delete this search, then throw an abort error.
          if (id !== undefined) {
            this.deps.http.delete(`/internal/search/es/${id}`);
          }
        },
      }),
      finalize(() => {
        this.pendingCount$.next(--this.pendingCount);
        cleanup();
      })
    );
  }
}
