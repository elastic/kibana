/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsSetup, Toast, HttpSetup } from 'src/core/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { SessionTimeoutWarning } from './session_timeout_warning';
import { ISessionExpired } from './session_expired';

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
  extend(): void;
}

export class SessionTimeout {
  private warningTimeoutMilliseconds?: number;
  private expirationTimeoutMilliseconds?: number;
  private warningToast?: Toast;

  constructor(
    private sessionTimeoutMilliseconds: number | null,
    private notifications: NotificationsSetup,
    private sessionExpired: ISessionExpired,
    private http: HttpSetup
  ) {}

  extend() {
    if (this.sessionTimeoutMilliseconds == null) {
      return;
    }

    if (this.warningTimeoutMilliseconds) {
      window.clearTimeout(this.warningTimeoutMilliseconds);
    }
    if (this.expirationTimeoutMilliseconds) {
      window.clearTimeout(this.expirationTimeoutMilliseconds);
    }
    if (this.warningToast) {
      this.notifications.toasts.remove(this.warningToast);
    }
    this.warningTimeoutMilliseconds = window.setTimeout(
      () => this.showWarning(),
      Math.max(this.sessionTimeoutMilliseconds - WARNING_MS - GRACE_PERIOD_MS, 0)
    );
    this.expirationTimeoutMilliseconds = window.setTimeout(
      () => this.sessionExpired.logout(),
      Math.max(this.sessionTimeoutMilliseconds - GRACE_PERIOD_MS, 0)
    );
  }

  private showWarning = () => {
    this.warningToast = this.notifications.toasts.add({
      color: 'warning',
      text: toMountPoint(<SessionTimeoutWarning onRefreshSession={this.refreshSession} />),
      title: i18n.translate('xpack.security.components.sessionTimeoutWarning.title', {
        defaultMessage: 'Warning',
      }),
      toastLifeTimeMs: Math.min(this.sessionTimeoutMilliseconds! - GRACE_PERIOD_MS, WARNING_MS),
    });
  };

  private refreshSession = () => {
    this.http.get('/api/security/v1/me');
  };
}
