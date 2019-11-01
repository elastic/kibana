/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsSetup, Toast, HttpSetup } from 'src/core/public';
import React from 'react';
import BroadcastChannel from 'broadcast-channel';
import LeaderElection from 'broadcast-channel/leader-election';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { SessionIdleTimeoutWarning } from './session_idle_timeout_warning';
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

export interface ISessionTimeout {
  init(): void;
  extend(url: string): void;
}

export class SessionTimeout {
  private channel: BroadcastChannel<SessionInfo>;
  private elector: ReturnType<typeof LeaderElection.create>;
  private sessionInfo?: SessionInfo;
  private updateTimer?: number;
  private warningTimer?: number;
  private expirationTimer?: number;
  private warningToast?: Toast;

  constructor(
    private notifications: NotificationsSetup,
    private sessionExpired: ISessionExpired,
    private http: HttpSetup
  ) {
    this.channel = new BroadcastChannel('session_timeout', { webWorkerSupport: false });
    this.elector = LeaderElection.create(this.channel, {
      fallbackInterval: 2000,
      responseTime: 1000,
    });
  }

  init() {
    if (this.isAnon()) {
      return;
    }

    // subscribe to a broadcast channel for session timeout messages
    // this allows us to synchronize the UX across tabs and avoid repetitive API calls
    this.channel.onmessage = this.receiveMessage;
    this.elector.awaitLeadership().then(() => {
      this.updateTimeouts();
    });

    // Triggers an initial call to the endpoint to get session info;
    // when that returns, it will set the timeout
    return this.getSessionInfo();
  }

  extend(url: string) {
    // ignore these URLs as they are requested by this module
    if (this.isAnon() || url.endsWith('/session/info') || url.endsWith('/session/extend')) {
      return;
    }

    if (this.warningToast) {
      // the warning is currently showing and the user has clicked elsewhere on the page;
      // make a new call to get the latest session info
      return this.getSessionInfo();
    }
  }

  private updateTimeouts = () => {
    const timeout = this.getTimeout();
    if (timeout == null) {
      return;
    }

    // cleanup
    if (this.updateTimer) {
      window.clearTimeout(this.updateTimer);
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

    // set timeouts
    const val = timeout - WARNING_MS - GRACE_PERIOD_MS - 1000;
    if (this.elector && this.elector.isLeader && val > 0) {
      // one tab should check for the latest session info before the warning displays
      // if session info has changed, that will be broadcasted to any other open tabs
      this.updateTimer = window.setTimeout(() => this.getSessionInfo(), val);
    }
    this.warningTimer = window.setTimeout(
      () => this.showWarning(),
      Math.max(timeout - WARNING_MS - GRACE_PERIOD_MS, 0)
    );
    this.expirationTimer = window.setTimeout(
      () => this.sessionExpired.logout(),
      Math.max(timeout - GRACE_PERIOD_MS, 0)
    );
  };

  private getTimeout = (): number | null => {
    let timeout = null;
    if (this.sessionInfo && this.sessionInfo.expires) {
      timeout = this.sessionInfo.expires - this.sessionInfo.now;
    }
    return timeout;
  };

  private receiveMessage = (sessionInfo: SessionInfo) => {
    this.sessionInfo = sessionInfo;
    this.updateTimeouts();
  };

  private showWarning = () => {
    const timeout = this.getTimeout();
    this.warningToast = this.notifications.toasts.add({
      color: 'warning',
      text: toMountPoint(<SessionTimeoutWarning onRefreshSession={this.refreshSession} />),
      title: i18n.translate('xpack.security.components.sessionIdleTimeoutWarning.title', {
        defaultMessage: 'Warning',
      }),
      toastLifeTimeMs: Math.min(timeout! - GRACE_PERIOD_MS, WARNING_MS),
    });
  };

  private getSessionInfo = async (extend = false) => {
    const path = `/api/security/session/${extend ? 'extend' : 'info'}`;
    const headers = extend ? {} : { 'kbn-system-api': 'true' };
    try {
      const result = await this.http.fetch(path, { method: 'GET', headers });

      this.sessionInfo = result;
      this.updateTimeouts();
      this.channel.postMessage(result);
    } catch (err) {
      // do nothing; 401 errors will be caught by the http interceptor
    }
  };

  private refreshSession = () => {
    this.getSessionInfo(true);
  };

  private isAnon = () => {
    return this.http.anonymousPaths.isAnonymous(window.location.pathname);
  };
}
