/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { throwError, Subscription, from, of } from 'rxjs';
import { tap, finalize, catchError, filter, take, skip, switchMap } from 'rxjs/operators';
import {
  TimeoutErrorMode,
  SearchInterceptor,
  SearchInterceptorDeps,
  UI_SETTINGS,
  IKibanaSearchRequest,
  SearchSessionState,
} from '../../../../../src/plugins/data/public';
import { ENHANCED_ES_SEARCH_STRATEGY, IAsyncSearchOptions, pollSearch } from '../../common';
import { SearchResponseCache } from './search_response_cache';
import { createRequestHash } from './utils';
import { SearchAbortController } from './search_abort_controller';

const MAX_CACHE_ITEMS = 50;
const MAX_CACHE_SIZE_MB = 10;
export class EnhancedSearchInterceptor extends SearchInterceptor {
  private uiSettingsSub: Subscription;
  private searchTimeout: number;
  private readonly responseCache: SearchResponseCache = new SearchResponseCache(
    MAX_CACHE_ITEMS,
    MAX_CACHE_SIZE_MB
  );

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
    this.responseCache.clear();
    this.uiSettingsSub.unsubscribe();
  }

  protected getTimeoutMode() {
    return this.application.capabilities.advancedSettings?.save
      ? TimeoutErrorMode.CHANGE
      : TimeoutErrorMode.CONTACT;
  }

  private createRequestHash$(request: IKibanaSearchRequest, options: IAsyncSearchOptions) {
    const { sessionId } = options;
    const { preference, ...params } = request.params || {};
    const hashOptions = {
      ...params,
      sessionId,
    };

    return from(sessionId ? createRequestHash(hashOptions) : of(undefined));
  }

  public search({ id, ...request }: IKibanaSearchRequest, options: IAsyncSearchOptions = {}) {
    const searchOptions = {
      strategy: ENHANCED_ES_SEARCH_STRATEGY,
      ...options,
    };
    const { sessionId, strategy, abortSignal } = searchOptions;
    const search = () => this.runSearch({ id, ...request }, searchOptions);

    // track if this search's session will be send to background
    // if yes, then we don't need to cancel this search when it is aborted
    let isSavedToBackground = false;
    const savedToBackgroundSub =
      this.deps.session.isCurrentSession(sessionId) &&
      this.deps.session.state$
        .pipe(
          skip(1), // ignore any state, we are only interested in transition x -> BackgroundLoading
          filter(
            (state) =>
              this.deps.session.isCurrentSession(sessionId) &&
              state === SearchSessionState.BackgroundLoading
          ),
          take(1)
        )
        .subscribe(() => {
          isSavedToBackground = true;
        });

    const cancel = once(() => {
      if (id && !isSavedToBackground) this.deps.http.delete(`/internal/search/${strategy}/${id}`);
    });

    return this.createRequestHash$(request, options).pipe(
      switchMap((requestHash) => {
        const cached = requestHash ? this.responseCache.get(requestHash) : undefined;
        if (cached) {
          return cached;
        }
        const searchAbortController = new SearchAbortController(abortSignal, this.searchTimeout);
        this.pendingCount$.next(this.pendingCount$.getValue() + 1);
        const untrackSearch = this.deps.session.isCurrentSession(options.sessionId)
          ? this.deps.session.trackSearch({ abort: () => searchAbortController.abort() })
          : undefined;

        const search$ = pollSearch(search, cancel, {
          ...options,
          abortSignal: searchAbortController.getSignal(),
        }).pipe(
          tap((response) => (id = response.id)),
          catchError((e: Error) => {
            cancel();
            return throwError(
              this.handleSearchError(e, options, searchAbortController.isTimeout())
            );
          }),
          finalize(() => {
            this.pendingCount$.next(this.pendingCount$.getValue() - 1);
            if (this.deps.session.isCurrentSession(options.sessionId)) {
              // untrack if this search still belongs to current session
              untrackSearch?.();
            } else {
              searchAbortController.cleanup();
            }
            if (savedToBackgroundSub) {
              savedToBackgroundSub.unsubscribe();
            }
          })
        );

        if (requestHash) {
          // Cache and return from cache
          return this.responseCache.set(requestHash, search$);
        }

        return search$;
      })
    );
  }
}
