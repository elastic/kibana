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
} from '@kbn/core/public';

import {
  SESSION_CHECK_MS,
  SESSION_EXPIRATION_WARNING_MS,
  SESSION_EXTENSION_THROTTLE_MS,
  SESSION_GRACE_PERIOD_MS,
  SESSION_ROUTE,
} from '../../common/constants';
import { LogoutReason } from '../../common/types';
import type { SessionInfo } from '../../common/types';
import { createSessionExpirationToast } from './session_expiration_toast';
import type { SessionExpired } from './session_expired';

export interface SessionState extends Pick<SessionInfo, 'expiresInMs' | 'canBeExtended'> {
  lastExtensionTime: number;
}

export class SessionTimeout {
  private channel?: BroadcastChannelType<SessionState>;

  private isVisible = document.visibilityState !== 'hidden';
  private isFetchingSessionInfo = false;
  private consecutiveErrorCount = 0;
  private snoozedWarningState?: SessionState;

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
    private sessionExpired: Pick<SessionExpired, 'logout'>,
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
    if (fetchOptions.path.indexOf('://') !== -1 || fetchOptions.path.startsWith('//')) {
      return;
    }

    if (!fetchOptions.asSystemRequest) {
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

  private resetTimers = ({ lastExtensionTime, expiresInMs }: SessionState) => {
    this.stopRefreshTimer = this.stopRefreshTimer?.();
    this.stopWarningTimer = this.stopWarningTimer?.();
    this.stopLogoutTimer = this.stopLogoutTimer?.();

    if (expiresInMs !== null) {
      const logoutInMs = Math.max(expiresInMs - SESSION_GRACE_PERIOD_MS, 0);

      // Show warning before session expires. However, do not show warning again if previously
      // dismissed. The snooze time is the expiration time that was remaining in the warning.
      const showWarningInMs = Math.max(
        logoutInMs - SESSION_EXPIRATION_WARNING_MS,
        this.snoozedWarningState
          ? this.snoozedWarningState.lastExtensionTime +
              this.snoozedWarningState.expiresInMs! -
              SESSION_GRACE_PERIOD_MS -
              lastExtensionTime
          : 0,
        0
      );

      const fetchSessionInMs = showWarningInMs - SESSION_CHECK_MS;

      // Schedule logout when session is about to expire
      this.stopLogoutTimer = startTimer(
        () => this.sessionExpired.logout(LogoutReason.SESSION_EXPIRED),
        logoutInMs
      );

      // Hide warning if session has been extended
      if (showWarningInMs > 0) {
        this.hideWarning();
      }

      // Schedule warning before session expires
      if (showWarningInMs < logoutInMs) {
        this.stopWarningTimer = startTimer(this.showWarning, showWarningInMs);
      }

      // Refresh session info before showing warning
      if (fetchSessionInMs > 0 && fetchSessionInMs < logoutInMs) {
        this.stopRefreshTimer = startTimer(this.fetchSessionInfo, fetchSessionInMs);
      }
    }
  };

  private toggleEventHandlers = ({ expiresInMs, canBeExtended }: SessionState) => {
    if (expiresInMs !== null) {
      // Monitor activity if session can be extended
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
      Date.now() >
        lastExtensionTime + SESSION_EXTENSION_THROTTLE_MS * Math.exp(this.consecutiveErrorCount)
    );
  }

  private fetchSessionInfo = async (extend = false) => {
    this.isFetchingSessionInfo = true;
    try {
      const sessionInfo = await this.http.fetch<SessionInfo | ''>(SESSION_ROUTE, {
        method: extend ? 'POST' : 'GET',
        asSystemRequest: !extend,
      });
      this.consecutiveErrorCount = 0;
      if (sessionInfo) {
        const { expiresInMs, canBeExtended } = sessionInfo;
        const nextState: SessionState = {
          lastExtensionTime: Date.now(),
          expiresInMs,
          canBeExtended,
        };
        this.sessionState$.next(nextState);
        if (this.channel) {
          this.channel.postMessage(nextState);
        }
        return nextState;
      }
    } catch (error) {
      this.consecutiveErrorCount++;
    } finally {
      this.isFetchingSessionInfo = false;
    }
  };

  private showWarning = () => {
    if (!this.warningToast) {
      const onExtend = async () => {
        const { canBeExtended } = this.sessionState$.getValue();
        if (canBeExtended) {
          await this.fetchSessionInfo(true);
        }
      };
      const onClose = () => {
        this.hideWarning(true);
        return onExtend();
      };
      const toast = createSessionExpirationToast(this.sessionState$, onExtend, onClose);
      this.warningToast = this.notifications.toasts.add(toast);
    }
  };

  private hideWarning = (snooze = false) => {
    if (this.warningToast) {
      this.notifications.toasts.remove(this.warningToast);
      this.warningToast = undefined;
      if (snooze) {
        this.snoozedWarningState = this.sessionState$.getValue();
      }
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
export function startTimer(callback: () => void, timeout: number, updater?: (id: number) => void) {
  // Max timeout is the largest possible 32-bit signed integer or 2,147,483,647 or 0x7fffffff.
  const maxTimeout = 0x7fffffff;
  let timeoutID: number;
  updater = updater ?? ((id: number) => (timeoutID = id));

  updater(
    timeout > maxTimeout
      ? window.setTimeout(() => startTimer(callback, timeout - maxTimeout, updater), maxTimeout)
      : window.setTimeout(callback, timeout)
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
 * Adds event handlers to the document object that track page visibility.
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
