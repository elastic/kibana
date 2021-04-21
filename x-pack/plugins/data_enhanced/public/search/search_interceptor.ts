/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { throwError, Subscription, from, of, fromEvent, EMPTY } from 'rxjs';
import {
  tap,
  finalize,
  catchError,
  filter,
  take,
  skip,
  switchMap,
  shareReplay,
  map,
  takeUntil,
} from 'rxjs/operators';
import {
  TimeoutErrorMode,
  SearchInterceptor,
  SearchInterceptorDeps,
  UI_SETTINGS,
  IKibanaSearchRequest,
  SearchSessionState,
} from '../../../../../src/plugins/data/public';
import {
  ENHANCED_ES_SEARCH_STRATEGY,
  IAsyncSearchOptions,
  pollSearch,
} from '../../../../../src/plugins/data/common';
import { createRequestHash } from './utils';
import { SearchResponseCache } from './search_response_cache';
import { AbortError } from '../../../../../src/plugins/kibana_utils/public';
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
    const { sessionId, isRestore } = options;
    // Preference is used to ensure all queries go to the same set of shards and it doesn't need to be hashed
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-shard-routing.html#shard-and-node-preference
    const { preference, ...params } = request.params || {};
    const hashOptions = {
      ...params,
      sessionId,
      isRestore,
    };

    return from(sessionId ? createRequestHash(hashOptions) : of(undefined));
  }

  /**
   * @internal
   * Creates a new pollSearch that share replays its results
   */
  private runSearch$(
    { id, ...request }: IKibanaSearchRequest,
    options: IAsyncSearchOptions,
    searchAbortController: SearchAbortController
  ) {
    const search = () => this.runSearch({ id, ...request }, options);
    const { sessionId, strategy } = options;

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

    return pollSearch(search, cancel, {
      ...options,
      abortSignal: searchAbortController.getSignal(),
    }).pipe(
      tap((response) => (id = response.id)),
      catchError((e: Error) => {
        cancel();
        return throwError(e);
      }),
      finalize(() => {
        searchAbortController.cleanup();
        if (savedToBackgroundSub) {
          savedToBackgroundSub.unsubscribe();
        }
      }),
      // This observable is cached in the responseCache.
      // Using shareReplay makes sure that future subscribers will get the final response

      shareReplay(1)
    );
  }

  /**
   * @internal
   * Creates a new search observable and a corresponding search abort controller
   * If requestHash is defined, tries to return them first from cache.
   */
  private getSearchResponse$(
    request: IKibanaSearchRequest,
    options: IAsyncSearchOptions,
    requestHash?: string
  ) {
    const cached = requestHash ? this.responseCache.get(requestHash) : undefined;

    const searchAbortController =
      cached?.searchAbortController || new SearchAbortController(this.searchTimeout);

    // Create a new abort signal if one was not passed. This fake signal will never be aborted,
    // So the underlaying search will not be aborted, even if the other consumers abort.
    searchAbortController.addAbortSignal(options.abortSignal ?? new AbortController().signal);
    const response$ = cached?.response$ || this.runSearch$(request, options, searchAbortController);

    if (requestHash && !this.responseCache.has(requestHash)) {
      this.responseCache.set(requestHash, {
        response$,
        searchAbortController,
      });
    }

    return {
      response$,
      searchAbortController,
    };
  }

  public search({ id, ...request }: IKibanaSearchRequest, options: IAsyncSearchOptions = {}) {
    const searchOptions = {
      strategy: ENHANCED_ES_SEARCH_STRATEGY,
      ...options,
    };
    const { sessionId, abortSignal } = searchOptions;

    return this.createRequestHash$(request, searchOptions).pipe(
      switchMap((requestHash) => {
        const { searchAbortController, response$ } = this.getSearchResponse$(
          request,
          searchOptions,
          requestHash
        );

        this.pendingCount$.next(this.pendingCount$.getValue() + 1);
        const untrackSearch = this.deps.session.isCurrentSession(sessionId)
          ? this.deps.session.trackSearch({ abort: () => searchAbortController.abort() })
          : undefined;

        // Abort the replay if the abortSignal is aborted.
        // The underlaying search will not abort unless searchAbortController fires.
        const aborted$ = (abortSignal ? fromEvent(abortSignal, 'abort') : EMPTY).pipe(
          map(() => {
            throw new AbortError();
          })
        );

        return response$.pipe(
          takeUntil(aborted$),
          catchError((e) => {
            return throwError(
              this.handleSearchError(e, searchOptions, searchAbortController.isTimeout())
            );
          }),
          finalize(() => {
            this.pendingCount$.next(this.pendingCount$.getValue() - 1);
            if (untrackSearch && this.deps.session.isCurrentSession(sessionId)) {
              // untrack if this search still belongs to current session
              untrackSearch();
            }
          })
        );
      })
    );
  }
}
