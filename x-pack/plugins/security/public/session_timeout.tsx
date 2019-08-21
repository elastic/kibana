/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsSetup, Toast, HttpSetup } from 'src/core/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SessionExpirationWarning } from './session_expiration_warning';
import { SessionExpired } from './session_expired';

/**
 * Client session timeout is decreased by this number so that Kibana server
 * can still access session content during logout request to properly clean
 * user session up (invalidate access tokens, redirect to logout portal etc.).
 * @type {number}
 */
const SESSION_TIMEOUT_GRACE_PERIOD_MS = 5 * 1000;

const EXPIRATION_WARNING_MS = 60 * 1000;

export interface ISessionTimeout {
  extend(): void;
}

export class SessionTimeout {
  private sessionExpirationWarningTimeout?: number;
  private sessionExpirationTimeout?: number;
  private activeNotification?: Toast;

  constructor(
    private sessionTimeout: number,
    private notifications: NotificationsSetup,
    private sessionExpired: SessionExpired,
    private http: HttpSetup
  ) {}

  extend(): void {
    if (this.sessionExpirationWarningTimeout) {
      window.clearTimeout(this.sessionExpirationWarningTimeout);
    }
    if (this.sessionExpirationTimeout) {
      window.clearTimeout(this.sessionExpirationTimeout);
    }
    if (this.activeNotification) {
      this.notifications.toasts.remove(this.activeNotification);
    }
    this.sessionExpirationWarningTimeout = window.setTimeout(
      () => this.showSessionExpirationWarning(),
      Math.max(this.sessionTimeout - EXPIRATION_WARNING_MS - SESSION_TIMEOUT_GRACE_PERIOD_MS, 0)
    );
    this.sessionExpirationTimeout = window.setTimeout(
      () => this.sessionExpired.logout(),
      Math.max(this.sessionTimeout - SESSION_TIMEOUT_GRACE_PERIOD_MS, 0)
    );
  }

  private showSessionExpirationWarning = () => {
    this.activeNotification = this.notifications.toasts.add({
      color: 'warning',
      text: <SessionExpirationWarning onRefreshSession={this.refreshSession} />,
      title: i18n.translate('xpack.security.hacks.warningTitle', {
        defaultMessage: 'Warning',
      }),
      toastLifeTimeMs: Math.min(
        this.sessionTimeout - SESSION_TIMEOUT_GRACE_PERIOD_MS,
        EXPIRATION_WARNING_MS
      ),
    });
  };

  private refreshSession = () => {
    this.http.get('/api/security/v1/me');
  };
}
