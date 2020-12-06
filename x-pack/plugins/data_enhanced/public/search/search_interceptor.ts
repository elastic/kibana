/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
import { ApplicationStart, ToastsStart } from 'kibana/public';
import { getLongQueryNotification } from './long_query_notification';
import { getBackgroundRunningNotification } from './background_running_notification';
import { BackgroundSessionService } from '../background_session';
import { SearchInterceptor, DataPublicPluginStart } from '../../../../../src/plugins/data/public';

export class EnhancedSearchInterceptor extends SearchInterceptor {
  private isRestoreCache: Map<string, boolean> = new Map();

  /**
   * This class should be instantiated with a `requestTimeout` corresponding with how many ms after
   * requests are initiated that they should automatically cancel.
   * @param toasts The `core.notifications.toasts` service
   * @param application The `core.application` service
   * @param requestTimeout Usually config value `elasticsearch.requestTimeout`
   * @param backgroundSessionService Used to submit sessions to background upon request
   */
  constructor(
    private readonly backgroundSessionService: BackgroundSessionService,
    private readonly data: DataPublicPluginStart,
    toasts: ToastsStart,
    application: ApplicationStart,
    requestTimeout?: number
  ) {
    super(toasts, application, requestTimeout);
=======
import { throwError, Subscription } from 'rxjs';
import { tap, finalize, catchError, filter, take, skip } from 'rxjs/operators';
import {
  TimeoutErrorMode,
  SearchInterceptor,
  SearchInterceptorDeps,
  UI_SETTINGS,
  IKibanaSearchRequest,
  SessionState,
} from '../../../../../src/plugins/data/public';
import { AbortError } from '../../../../../src/plugins/kibana_utils/common';
import { ENHANCED_ES_SEARCH_STRATEGY, IAsyncSearchOptions, pollSearch } from '../../common';

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
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
  }

  /**
   * Abort our `AbortController`, which in turn aborts any intercepted searches.
   */
  public cancelPending = () => {
    this.abortController.abort();
    this.abortController = new AbortController();
    if (this.deps.usageCollector) this.deps.usageCollector.trackQueriesCancelled();
  };

<<<<<<< HEAD
  /**
   * Un-schedule timing out all of the searches intercepted.
   */
  public runBeyondTimeout = async () => {
    this.hideToast();
    this.timeoutSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.timeoutSubscriptions.clear();
    const stored = await this.backgroundSessionService.store();
    if (stored) {
      this.events$.next({
        name: 'background',
        sessionId: this.data.search.session.get(),
      });
      this.toasts.addInfo(
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
    const currentSessionId = this.data.search.session.get();
    if (this.isRestoreCache.get(currentSessionId) !== undefined) return false;

    // set before await to avoid additional fetches
    this.isRestoreCache.set(currentSessionId, false);

    const bgSession = await this.backgroundSessionService.get();
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
      this.longRunningToast = this.toasts.addInfo(
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
  };
=======
  public search({ id, ...request }: IKibanaSearchRequest, options: IAsyncSearchOptions = {}) {
    const { combinedSignal, timeoutSignal, cleanup, abort } = this.setupAbortSignal({
      abortSignal: options.abortSignal,
      timeout: this.searchTimeout,
    });
    const strategy = options?.strategy ?? ENHANCED_ES_SEARCH_STRATEGY;
    const searchOptions = { ...options, strategy, abortSignal: combinedSignal };
    const search = () => this.runSearch({ id, ...request }, searchOptions);

    this.pendingCount$.next(this.pendingCount$.getValue() + 1);
    const isCurrentSession = () =>
      !!options.sessionId && options.sessionId === this.deps.session.getSessionId();

    const untrackSearch = isCurrentSession() && this.deps.session.trackSearch({ abort });

    // track if this search's session will be send to background
    // if yes, then we don't need to cancel this search when it is aborted
    let isSavedToBackground = false;
    const savedToBackgroundSub =
      isCurrentSession() &&
      this.deps.session.state$
        .pipe(
          skip(1), // ignore any state, we are only interested in transition x -> BackgroundLoading
          filter((state) => isCurrentSession() && state === SessionState.BackgroundLoading),
          take(1)
        )
        .subscribe(() => {
          isSavedToBackground = true;
        });

    return pollSearch(search, { ...options, abortSignal: combinedSignal }).pipe(
      tap((response) => (id = response.id)),
      catchError((e: AbortError) => {
        if (id && !isSavedToBackground) this.deps.http.delete(`/internal/search/${strategy}/${id}`);
        return throwError(this.handleSearchError(e, timeoutSignal, options));
      }),
      finalize(() => {
        this.pendingCount$.next(this.pendingCount$.getValue() - 1);
        cleanup();
        if (untrackSearch && isCurrentSession()) {
          untrackSearch();
        }
        if (savedToBackgroundSub) {
          savedToBackgroundSub.unsubscribe();
        }
      })
    );
  }
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
}
