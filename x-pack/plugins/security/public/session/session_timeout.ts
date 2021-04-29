/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BroadcastChannel } from 'broadcast-channel';
import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { skip, tap, throttleTime } from 'rxjs/operators';

import type {
  HttpFetchOptionsWithPath,
  HttpResponse,
  HttpSetup,
  NotificationsSetup,
  Toast,
} from 'src/core/public';

import type { SessionInfo } from '../../common/types';
import { createSessionExpirationToast } from './session_expiration_toast';
import type { ISessionExpired } from './session_expired';

/**
 * Client session timeout is decreased by this number so that Kibana server can still access session
 * content during logout request to properly clean user session up (invalidate access tokens,
 * redirect to logout portal etc.).
 */
export const GRACE_PERIOD_MS = 5 * 1000;

/**
 * Duration we'll normally display the warning toast
 */
export const WARNING_MS = 5 * 60 * 1000;

/**
 * Current session info is checked this number of milliseconds before the warning toast shows. This
 * will prevent the toast from being shown if the session has already been extended.
 */
export const SESSION_CHECK_MS = 1000;

/**
 * Session will be extended at most once this number of milliseconds while user activity is detected.
 */
export const EXTENSION_THROTTLE_MS = 60 * 1000;

/**
 * Route to get session info and extend session expiration
 */
export const SESSION_ROUTE = '/internal/security/session';

export interface SessionState extends Pick<SessionInfo, 'expiresInMs' | 'canBeExtended'> {
  lastExtensionTime: number;
}

export class SessionTimeout {
  private channel?: BroadcastChannel<SessionState>;

  private isVisible = document.visibilityState !== 'hidden';
  private isExtending = false;

  private sessionState$ = new BehaviorSubject<SessionState>({
    lastExtensionTime: 0,
    expiresInMs: null,
    canBeExtended: false,
  });
  private subscription?: Subscription;

  private warningToast?: Toast;

  private stopActivityMonitor?: Function;
  private stopVisibilityMonitor?: Function;
  private removeHttpInterceptor?: Function;

  private stopRefreshTimer?: Function;
  private stopWarningTimer?: Function;
  private stopLogoutTimer?: Function;

  constructor(
    private notifications: NotificationsSetup,
    private sessionExpired: ISessionExpired,
    private http: HttpSetup,
    private tenant: string
  ) {}

  public start() {
    if (this.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    this.subscription = this.sessionState$
      .pipe(skip(1), throttleTime(1000), tap(this.toggleEventHandlers))
      .subscribe(this.resetTimers);

    return this.fetchSessionInfo();
  }

  public stop() {
    const nextState = {
      lastExtensionTime: 0,
      expiresInMs: null,
      canBeExtended: false,
    };
    this.toggleEventHandlers(nextState);
    this.resetTimers(nextState);
    this.subscription?.unsubscribe();
  }

  /**
   * Event handler that receives session information from other browser tabs.
   */
  private handleChannelMessage = (message: SessionState) => {
    this.sessionState$.next(message);
  };

  /**
   * HTTP request interceptor which ensures that API calls extend the session only if tab is
   * visible.
   */
  private handleHttpRequest = (fetchOptions: HttpFetchOptionsWithPath) => {
    // Ignore requests to external URLs
    if (fetchOptions.path.indexOf('://') !== -1) {
      return;
    }

    if (fetchOptions.asSystemRequest === undefined) {
      return { asSystemRequest: !this.isVisible };
    }
  };

  /**
   * HTTP response interceptor which allows us to prevent extending the session manually if it has
   * already been extended as part of an API call.
   */
  private handleHttpResponse = (httpResponse: HttpResponse) => {
    // Ignore session endpoint which is already handled by fetch callback
    if (httpResponse.fetchOptions.path === SESSION_ROUTE) {
      return;
    }

    // Extend session unless we're dealing with a system request
    if (httpResponse.fetchOptions.asSystemRequest === false) {
      if (this.shouldExtend()) {
        this.fetchSessionInfo(true);
      }
    }
  };

  /**
   * Event handler that tracks user activity and extends the session if needed.
   */
  private handleUserActivity = () => {
    if (this.shouldExtend()) {
      this.fetchSessionInfo(true);
    }
  };

  /**
   * Event handler that tracks page visibility.
   */
  private handleVisibilityChange = (isVisible: boolean) => {
    this.isVisible = isVisible;
    if (isVisible) {
      this.handleUserActivity();
    }
  };

  private resetTimers = ({ expiresInMs }: SessionState) => {
    this.stopRefreshTimer = this.stopRefreshTimer?.();
    this.stopWarningTimer = this.stopWarningTimer?.();
    this.stopLogoutTimer = this.stopLogoutTimer?.();

    if (expiresInMs !== null) {
      const refreshTimeout = expiresInMs - GRACE_PERIOD_MS - WARNING_MS - SESSION_CHECK_MS;
      const warningTimeout = Math.max(expiresInMs - GRACE_PERIOD_MS - WARNING_MS, 0);
      const logoutTimeout = Math.max(expiresInMs - GRACE_PERIOD_MS, 0);

      // 1. Refresh session info before displaying any warnings
      if (refreshTimeout > 0) {
        this.stopRefreshTimer = startTimer(this.fetchSessionInfo, refreshTimeout);
      }

      // 2. Afterwards, show warning toast
      if (warningTimeout > 0) {
        this.hideWarning();
      }
      this.stopWarningTimer = startTimer(this.showWarning, warningTimeout);

      // 3. Finally, logout
      this.stopLogoutTimer = startTimer(() => this.sessionExpired.logout(), logoutTimeout);
    }
  };

  private toggleEventHandlers = ({ expiresInMs, canBeExtended }: SessionState) => {
    if (expiresInMs !== null) {
      if (!this.channel) {
        // Subscribe to a broadcast channel for session timeout messages.
        // This allows us to synchronize the UX across tabs and avoid repetitive API calls.
        this.channel = new BroadcastChannel(`${this.tenant}/session_timeout`, {
          webWorkerSupport: false,
        });
        this.channel.onmessage = this.handleChannelMessage;
      }

      // Monitor activity if session can be extended. No need to do it if idleTimeout hasn't been
      // configured.
      if (canBeExtended && !this.stopActivityMonitor) {
        this.stopActivityMonitor = monitorActivity(this.handleUserActivity);
      }

      // Intercept HTTP requests if session can expire
      if (!this.removeHttpInterceptor) {
        this.removeHttpInterceptor = this.http.intercept({
          request: this.handleHttpRequest,
          response: this.handleHttpResponse,
        });
      }

      if (!this.stopVisibilityMonitor) {
        this.stopVisibilityMonitor = monitorVisibility(this.handleVisibilityChange);
      }
    } else {
      if (this.channel) {
        this.channel.close();
        this.channel = undefined;
      }
      this.removeHttpInterceptor = this.removeHttpInterceptor?.();
      this.stopActivityMonitor = this.stopActivityMonitor?.();
      this.stopVisibilityMonitor = this.stopVisibilityMonitor?.();
    }
  };

  private shouldExtend() {
    const { lastExtensionTime } = this.sessionState$.getValue();
    return (
      !this.isExtending &&
      !this.warningToast &&
      Date.now() > lastExtensionTime + EXTENSION_THROTTLE_MS
    );
  }

  private fetchSessionInfo = async (extend = false) => {
    this.isExtending = true;
    try {
      const { expiresInMs, canBeExtended } = await this.http.fetch<SessionInfo>(SESSION_ROUTE, {
        method: extend ? 'POST' : 'GET',
        asSystemRequest: !extend,
      });

      const nextState = {
        lastExtensionTime: Date.now(),
        expiresInMs,
        canBeExtended,
      };
      this.sessionState$.next(nextState);
      if (this.channel) {
        this.channel.postMessage(nextState);
      }
    } catch (error) {
      // ignore
    } finally {
      this.isExtending = false;
    }
  };

  private showWarning = () => {
    if (!this.warningToast) {
      const onExtend = () => this.fetchSessionInfo(true);
      const onClose = () => (this.warningToast = undefined);
      const toast = createSessionExpirationToast(this.sessionState$, onExtend, onClose);
      this.warningToast = this.notifications.toasts.add(toast);
    }
  };

  private hideWarning = () => {
    if (this.warningToast) {
      this.notifications.toasts.remove(this.warningToast);
      this.warningToast = undefined;
    }
  };
}

/**
 * Starts a timer that uses a native `setTimeout` under the hood. When `timeout` is larger
 * than the maximum supported one then method calls itself recursively as many times as needed.
 * @param callback A function to be executed after the timer expires.
 * @param timeout The time, in milliseconds the timer should wait before the specified function is
 * executed.
 * @returns Function to stop the timer.
 */
export function startTimer(
  callback: () => void,
  timeout: number,
  updater?: (id: NodeJS.Timeout) => void
) {
  // Max timeout is the largest possible 32-bit signed integer or 2,147,483,647 or 0x7fffffff.
  const maxTimeout = 0x7fffffff;
  let timeoutID: NodeJS.Timeout;
  updater = updater ?? ((id: NodeJS.Timeout) => (timeoutID = id));

  updater(
    timeout > maxTimeout
      ? setTimeout(() => startTimer(callback, timeout - maxTimeout, updater), maxTimeout)
      : setTimeout(callback, timeout)
  );

  return () => clearTimeout(timeoutID);
}

/**
 * Adds event handlers to the window object that track user activity.
 * @param callback Function to be executed when user activity is detected.
 * @returns Function to remove all event handlers from window.
 */
function monitorActivity(callback: () => void) {
  const eventTypes = ['mousemove', 'mousedown', 'wheel', 'touchstart', 'keydown'];
  for (const eventType of eventTypes) {
    window.addEventListener(eventType, callback);
  }

  return () => {
    for (const eventType of eventTypes) {
      window.removeEventListener(eventType, callback);
    }
  };
}

/**
 * Adds event handlers to the document object that track page visility.
 * @param callback Function to be executed when page visibility changes.
 * @returns Function to remove all event handlers from document.
 */
function monitorVisibility(callback: (isVisible: boolean) => void) {
  const handleVisibilityChange = () => callback(document.visibilityState !== 'hidden');

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
