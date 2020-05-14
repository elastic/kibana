/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationStart, ToastsStart } from 'kibana/public';
import { getLongQueryNotification } from './long_query_notification';
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
    this.timeoutSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.timeoutSubscriptions.clear();
    this.backgroundSessionService.store();
    this.events$.next({
      name: 'background',
      sessionId: this.data.search.session.get(),
    });
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
}
