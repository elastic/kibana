/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsSetup, Toast, HttpSetup, ToastInput } from 'src/core/public';
import { BroadcastChannel } from 'broadcast-channel';
import { createToast as createIdleTimeoutToast } from './session_idle_timeout_warning';
import { createToast as createLifespanToast } from './session_lifespan_warning';
import { ISessionExpired } from './session_expired';
import { SessionInfo } from '../types';

/**
 * Client session timeout is decreased by this number so that Kibana server
 * can still access session content during logout request to properly clean
 * user session up (invalidate access tokens, redirect to logout portal etc.).
 */
const GRACE_PERIOD_MS = 5 * 1000;

/**
 * Duration we'll normally display the warning toast
 */
const WARNING_MS = 60 * 1000;

/**
 * Current session info is checked this number of milliseconds before the
 * warning toast shows. This will prevent the toast from being shown if the
 * session has already been extended.
 */
const SESSION_CHECK_MS = 1000;

/**
 * Route to get session info and extend session expiration
 */
const SESSION_ROUTE = '/internal/security/session';

export interface ISessionTimeout {
  start(): void;
  stop(): void;
  extend(url: string): void;
}

export class SessionTimeout {
  private channel?: BroadcastChannel<SessionInfo>;
  private sessionInfo?: SessionInfo;
  private fetchTimer?: number;
  private warningTimer?: number;
  private expirationTimer?: number;
  private warningToast?: Toast;

  constructor(
    private notifications: NotificationsSetup,
    private sessionExpired: ISessionExpired,
    private http: HttpSetup,
    private tenant: string
  ) {}

  start() {
    if (this.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    // subscribe to a broadcast channel for session timeout messages
    // this allows us to synchronize the UX across tabs and avoid repetitive API calls
    const name = `${this.tenant}/session_timeout`;
    this.channel = new BroadcastChannel(name, { webWorkerSupport: false });
    this.channel.onmessage = this.handleSessionInfoAndResetTimers;

    // Triggers an initial call to the endpoint to get session info;
    // when that returns, it will set the timeout
    return this.fetchSessionInfoAndResetTimers();
  }

  stop() {
    if (this.channel) {
      this.channel.close();
    }
    this.cleanup();
  }

  /**
   * When the user makes an authenticated, non-system API call, this function is used to check
   * and see if the session has been extended.
   * @param url The URL that was called
   */
  extend(url: string) {
    // avoid an additional API calls when the user clicks the button on the session idle timeout
    if (url.endsWith(SESSION_ROUTE)) {
      return;
    }

    const { isLifespanTimeout } = this.getTimeout();
    if (this.warningToast && !isLifespanTimeout) {
      // the idle timeout warning is currently showing and the user has clicked elsewhere on the page;
      // make a new call to get the latest session info
      return this.fetchSessionInfoAndResetTimers();
    }
  }

  /**
   * Fetch latest session information from the server, and optionally attempt to extend
   * the session expiration.
   */
  private fetchSessionInfoAndResetTimers = async (extend = false) => {
    const method = extend ? 'POST' : 'GET';
    const headers = extend ? {} : { 'kbn-system-api': 'true' };
    try {
      const result = await this.http.fetch(SESSION_ROUTE, { method, headers });

      this.handleSessionInfoAndResetTimers(result);

      // share this updated session info with any other tabs to sync the UX
      if (this.channel) {
        this.channel.postMessage(result);
      }
    } catch (err) {
      // do nothing; 401 errors will be caught by the http interceptor
    }
  };

  /**
   * Processes latest session information, and resets timers based on it. These timers are
   * used to trigger an HTTP call for updated session information, to show a timeout
   * warning, and to log the user out when their session is expired.
   */
  private handleSessionInfoAndResetTimers = (sessionInfo: SessionInfo) => {
    this.sessionInfo = sessionInfo;
    // save the provider name in session storage, we will need it when we log out
    const key = `${this.tenant}/session_provider`;
    sessionStorage.setItem(key, sessionInfo.provider);

    const { timeout, isLifespanTimeout } = this.getTimeout();
    if (timeout == null) {
      return;
    }

    this.cleanup();

    // set timers
    const timeoutVal = timeout - WARNING_MS - GRACE_PERIOD_MS - SESSION_CHECK_MS;
    if (timeoutVal > 0 && !isLifespanTimeout) {
      // we should check for the latest session info before the warning displays
      this.fetchTimer = window.setTimeout(this.fetchSessionInfoAndResetTimers, timeoutVal);
    }
    this.warningTimer = window.setTimeout(
      this.showWarning,
      Math.max(timeout - WARNING_MS - GRACE_PERIOD_MS, 0)
    );
    this.expirationTimer = window.setTimeout(
      () => this.sessionExpired.logout(),
      Math.max(timeout - GRACE_PERIOD_MS, 0)
    );
  };

  private cleanup = () => {
    if (this.fetchTimer) {
      window.clearTimeout(this.fetchTimer);
    }
    if (this.warningTimer) {
      window.clearTimeout(this.warningTimer);
    }
    if (this.expirationTimer) {
      window.clearTimeout(this.expirationTimer);
    }
    if (this.warningToast) {
      this.notifications.toasts.remove(this.warningToast);
      this.warningToast = undefined;
    }
  };

  /**
   * Get the amount of time until the session times out, and whether or not the
   * session has reached it maximum lifespan.
   */
  private getTimeout = (): { timeout: number | null; isLifespanTimeout: boolean } => {
    let timeout = null;
    let isLifespanTimeout = false;
    if (this.sessionInfo) {
      const { now, idleTimeoutExpiration, lifespanExpiration } = this.sessionInfo;
      if (idleTimeoutExpiration) {
        timeout = idleTimeoutExpiration - now;
      }
      if (
        lifespanExpiration &&
        (idleTimeoutExpiration === null || lifespanExpiration <= idleTimeoutExpiration)
      ) {
        timeout = lifespanExpiration - now;
        isLifespanTimeout = true;
      }
    }
    return { timeout, isLifespanTimeout };
  };

  /**
   * Show a warning toast depending on the session state.
   */
  private showWarning = () => {
    const { timeout, isLifespanTimeout } = this.getTimeout();
    const toastLifeTimeMs = Math.min(timeout! - GRACE_PERIOD_MS, WARNING_MS);
    let toast: ToastInput;
    if (!isLifespanTimeout) {
      const refresh = () => this.fetchSessionInfoAndResetTimers(true);
      toast = createIdleTimeoutToast(toastLifeTimeMs, refresh);
    } else {
      toast = createLifespanToast(toastLifeTimeMs);
    }
    this.warningToast = this.notifications.toasts.add(toast);
  };
}
