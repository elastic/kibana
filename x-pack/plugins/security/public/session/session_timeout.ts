/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BroadcastChannel as BroadcastChannelType } from 'broadcast-channel';
import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { skip, tap, throttleTime } from 'rxjs/operators';

import type {
  HttpFetchOptionsWithPath,
  HttpSetup,
  NotificationsSetup,
  Toast,
} from 'src/core/public';

import {
  SESSION_CHECK_MS,
  SESSION_EXPIRATION_WARNING_MS,
  SESSION_EXTENSION_THROTTLE_MS,
  SESSION_GRACE_PERIOD_MS,
  SESSION_ROUTE,
} from '../../common/constants';
import type { SessionInfo } from '../../common/types';
import { createSessionExpirationToast } from './session_expiration_toast';
import type { ISessionExpired } from './session_expired';

export interface SessionState extends Pick<SessionInfo, 'expiresInMs' | 'canBeExtended'> {
  lastExtensionTime: number;
}

export class SessionTimeout {
  private channel?: BroadcastChannelType<SessionState>;

  private isVisible = document.visibilityState !== 'hidden';
  private isFetchingSessionInfo = false;

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

  public async start() {
    if (this.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    this.subscription = this.sessionState$
      .pipe(skip(1), throttleTime(1000), tap(this.toggleEventHandlers))
      .subscribe(this.resetTimers);

    // Subscribe to a broadcast channel for session timeout messages.
    // This allows us to synchronize the UX across tabs and avoid repetitive API calls.
    try {
      const { BroadcastChannel } = await import('broadcast-channel');
      this.channel = new BroadcastChannel(`${this.tenant}/session_timeout`, {
        webWorkerSupport: false,
      });
      this.channel.onmessage = this.handleChannelMessage;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `Failed to load broadcast channel. Session management will not be kept in sync when multiple tabs are loaded.`,
        error
      );
    }

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
    this.channel?.close();
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
      return { ...fetchOptions, asSystemRequest: !this.isVisible };
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
      const refreshTimeout =
        expiresInMs - SESSION_GRACE_PERIOD_MS - SESSION_EXPIRATION_WARNING_MS - SESSION_CHECK_MS;
      const warningTimeout = Math.max(
        expiresInMs - SESSION_GRACE_PERIOD_MS - SESSION_EXPIRATION_WARNING_MS,
        0
      );
      const logoutTimeout = Math.max(expiresInMs - SESSION_GRACE_PERIOD_MS, 0);

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

  private toggleEventHandlers = async ({ expiresInMs, canBeExtended }: SessionState) => {
    if (expiresInMs !== null) {
      // Monitor activity if session can be extended. No need to do it if idleTimeout hasn't been
      // configured.
      if (canBeExtended && !this.stopActivityMonitor) {
        this.stopActivityMonitor = monitorActivity(this.handleUserActivity);
      }

      // Intercept HTTP requests if session can expire
      if (!this.removeHttpInterceptor) {
        this.removeHttpInterceptor = this.http.intercept({ request: this.handleHttpRequest });
      }

      if (!this.stopVisibilityMonitor) {
        this.stopVisibilityMonitor = monitorVisibility(this.handleVisibilityChange);
      }
    } else {
      this.removeHttpInterceptor = this.removeHttpInterceptor?.();
      this.stopActivityMonitor = this.stopActivityMonitor?.();
      this.stopVisibilityMonitor = this.stopVisibilityMonitor?.();
    }
  };

  private shouldExtend() {
    const { lastExtensionTime } = this.sessionState$.getValue();
    return (
      !this.isFetchingSessionInfo &&
      !this.warningToast &&
      Date.now() > lastExtensionTime + SESSION_EXTENSION_THROTTLE_MS
    );
  }

  private fetchSessionInfo = async (extend = false) => {
    this.isFetchingSessionInfo = true;
    try {
      const sessionInfo = await this.http.fetch<SessionInfo | ''>(SESSION_ROUTE, {
        method: extend ? 'POST' : 'GET',
        asSystemRequest: !extend,
      });
      if (sessionInfo) {
        const { expiresInMs, canBeExtended } = sessionInfo;
        const nextState = {
          lastExtensionTime: Date.now(),
          expiresInMs,
          canBeExtended,
        };
        this.sessionState$.next(nextState);
        if (this.channel) {
          this.channel.postMessage(nextState);
        }
      }
    } catch (error) {
      // ignore
    } finally {
      this.isFetchingSessionInfo = false;
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
