/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromEvent, Observable, throwError, NEVER, EMPTY, timer } from 'rxjs';
import { mergeMap, expand, takeUntil } from 'rxjs/operators';
import { getLongQueryNotification } from './long_query_notification';
import {
  SearchInterceptor,
  SearchInterceptorDeps,
  UI_SETTINGS,
} from '../../../../../src/plugins/data/public';
import { AbortError } from '../../../../../src/plugins/data/common';
import { IAsyncSearchOptions } from '.';
import { IAsyncSearchRequest, IAsyncSearchResponse } from '../../common';

export class EnhancedSearchInterceptor extends SearchInterceptor {
  /**
   * This class should be instantiated with a `requestTimeout` corresponding with how many ms after
   * requests are initiated that they should automatically cancel.
   * @param toasts The `core.notifications.toasts` service
   * @param application The `core.application` service
   * @param requestTimeout Usually config value `elasticsearch.requestTimeout`
   */
  constructor(deps: SearchInterceptorDeps, requestTimeout?: number) {
    super(deps, requestTimeout);
  }

  /**
   * Abort our `AbortController`, which in turn aborts any intercepted searches.
   */
  public cancelPending = () => {
    this.hideToast();
    this.abortController.abort();
    this.abortController = new AbortController();
  };

  /**
   * Un-schedule timing out all of the searches intercepted.
   */
  public runBeyondTimeout = () => {
    this.hideToast();
    this.timeoutSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.timeoutSubscriptions.clear();
  };

  protected showToast = () => {
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
  };

  public search(
    request: IAsyncSearchRequest,
    { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
  ): Observable<IAsyncSearchResponse> {
    let { id } = request;
    const syncSearch = super.search;

    request.params = {
      ignoreThrottled: !this.deps.uiSettings.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
      ...request.params,
    };

    const aborted$ = options?.signal
      ? fromEvent(options.signal, 'abort').pipe(
          mergeMap(() => {
            // If we haven't received the response to the initial request, including the ID, then
            // we don't need to send a follow-up request to delete this search. Otherwise, we
            // send the follow-up request to delete this search, then throw an abort error.
            if (id !== undefined) {
              this.deps.http.delete(`/internal/search/es/${id}`);
            }
            return throwError(new AbortError());
          })
        )
      : NEVER;

    return (syncSearch.call(this, request, options) as Observable<IAsyncSearchResponse>).pipe(
      expand((response) => {
        const { is_partial: isPartial, is_running: isRunning } = response;
        // If the response indicates of an error, stop polling and complete the observable
        if (!response || (isPartial && !isRunning)) {
          return throwError(new AbortError());
        }

        // If the response indicates it is complete, stop polling and complete the observable
        if (!isRunning) return EMPTY;

        id = response.id;
        // Delay by the given poll interval
        return timer(pollInterval).pipe(
          // Send future requests using just the ID from the response
          mergeMap(() => {
            return syncSearch.call(this, { id }, options) as Observable<IAsyncSearchResponse>;
          })
        );
      }),
      takeUntil(aborted$)
    );
  }
}
