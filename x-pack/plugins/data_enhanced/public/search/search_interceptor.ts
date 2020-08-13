/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { throwError, EMPTY, timer, from } from 'rxjs';
import { mergeMap, expand, takeUntil, finalize, tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { SearchInterceptor, UI_SETTINGS } from '../../../../../src/plugins/data/public';
import { AbortError, toPromise } from '../../../../../src/plugins/data/common';
import { IAsyncSearchOptions } from '.';
import { EnhancedSearchInterceptorDeps } from './types';
import { IAsyncSearchRequest } from '../../common';

interface SessionInfo {
  requests: Record<string, string>;
}

export class EnhancedSearchInterceptor extends SearchInterceptor {
  private readonly idMapping: Map<string, SessionInfo>;
  /**
   * This class should be instantiated with a `requestTimeout` corresponding with how many ms after
   * requests are initiated that they should automatically cancel.
   * @param deps `SearchInterceptorDeps`
   * @param requestTimeout Usually config value `elasticsearch.requestTimeout`
   */
  constructor(protected readonly deps: EnhancedSearchInterceptorDeps, requestTimeout?: number) {
    super(deps, requestTimeout);

    this.idMapping = new Map();
  }

  private createHash(keys: Record<any, any>) {
    return createHash(`md5`).update(JSON.stringify(keys)).digest('hex');
  }

  private trackRequest(request: IAsyncSearchRequest, searchId?: string) {
    const { sessionId } = request;
    if (sessionId && searchId && request.params) {
      let sessionInfo = this.idMapping.get(sessionId);
      if (!sessionInfo) {
        sessionInfo = {
          requests: {},
        };
        this.idMapping.set(sessionId, sessionInfo);
      }
      sessionInfo.requests[this.createHash(request.params.body)] = searchId;
    }
  }

  /**
   * Abort our `AbortController`, which in turn aborts any intercepted searches.
   */
  public cancelPending = () => {
    this.abortController.abort();
    this.abortController = new AbortController();
    if (this.deps.usageCollector) this.deps.usageCollector.trackQueriesCancelled();
  };

  /**
   * Un-schedule timing out all of the searches intercepted.
   */
  public sendToBackground = async () => {
    this.timeoutSubscriptions.unsubscribe();
    if (this.deps.usageCollector) this.deps.usageCollector.trackLongQueryRunBeyondTimeout();

    const sessionId = this.deps.session.get();
    const sessionInfo = this.idMapping.get(sessionId);

    return await this.deps.session.store(sessionId, sessionInfo?.requests);
  };

  public search(
    request: IAsyncSearchRequest,
    { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
  ) {
    let { id } = request;

    request.stored = this.deps.session.getStored();
    request.restore = this.deps.session.isRestoredSession();

    request.params = {
      ignoreThrottled: !this.deps.uiSettings.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
      ...request.params,
    };

    const { combinedSignal, cleanup } = this.setupTimers(options);
    const aborted$ = from(toPromise(combinedSignal));

    this.pendingCount$.next(this.pendingCount$.getValue() + 1);

    return this.runSearch(request, combinedSignal, options?.strategy).pipe(
      expand((response) => {
        // If the response indicates of an error, stop polling and complete the observable
        if (!response || (!response.isRunning && response.isPartial)) {
          return throwError(new AbortError());
        }

        // If the response indicates it is complete, stop polling and complete the observable
        if (!response.isRunning) {
          return EMPTY;
        }

        id = response.id;

        this.trackRequest(request, id);

        // Delay by the given poll interval
        return timer(pollInterval).pipe(
          // Send future requests using just the ID from the response
          mergeMap(() => {
            const stored = this.deps.session.getStored();
            return this.runSearch({ id, stored }, combinedSignal, options?.strategy);
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
        this.pendingCount$.next(this.pendingCount$.getValue() - 1);
        cleanup();
      })
    );
  }
}
