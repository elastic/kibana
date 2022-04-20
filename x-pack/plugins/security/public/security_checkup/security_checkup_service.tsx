/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, from } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import type {
  DocLinksStart,
  HttpSetup,
  HttpStart,
  NotificationsStart,
  Toast,
} from '@kbn/core/public';

import type { SecurityCheckupState } from '../../common/types';
import type { ConfigType } from '../config';
import { insecureClusterAlertText, insecureClusterAlertTitle } from './components';

interface SetupDeps {
  http: HttpSetup;
}

interface StartDeps {
  http: HttpStart;
  notifications: NotificationsStart;
  docLinks: DocLinksStart;
}

const DEFAULT_SECURITY_CHECKUP_STATE = Object.freeze<SecurityCheckupState>({
  displayAlert: false,
});

export class SecurityCheckupService {
  private enabled: boolean;

  private alertVisibility$: BehaviorSubject<boolean>;

  private storage: Storage;

  private alertToast?: Toast;

  private storageKey?: string;

  constructor(config: Pick<ConfigType, 'showInsecureClusterWarning'>, storage: Storage) {
    this.storage = storage;
    this.enabled = config.showInsecureClusterWarning;
    this.alertVisibility$ = new BehaviorSubject(this.enabled);
  }

  public setup({ http }: SetupDeps) {
    const tenant = http.basePath.serverBasePath;
    this.storageKey = `insecureClusterWarningVisibility${tenant}`;
    this.enabled = this.enabled && this.getPersistedVisibilityPreference();
    this.alertVisibility$.next(this.enabled);
  }

  public start(startDeps: StartDeps) {
    if (this.enabled) {
      this.initializeAlert(startDeps);
    }
  }

  private initializeAlert({ http, notifications, docLinks }: StartDeps) {
    const appState$ = from(this.getSecurityCheckupState(http));

    // 10 days is reasonably long enough to call "forever" for a page load.
    // Can't go too much longer than this. See https://github.com/elastic/kibana/issues/64264#issuecomment-618400354
    const oneMinute = 60000;
    const tenDays = oneMinute * 60 * 24 * 10;

    combineLatest([appState$, this.alertVisibility$])
      .pipe(
        map(([{ displayAlert }, isAlertVisible]) => displayAlert && isAlertVisible),
        distinctUntilChanged()
      )
      .subscribe((showAlert) => {
        if (showAlert && !this.alertToast) {
          this.alertToast = notifications.toasts.addWarning(
            {
              title: insecureClusterAlertTitle,
              text: insecureClusterAlertText(docLinks, (persist: boolean) =>
                this.setAlertVisibility(false, persist)
              ),
              iconType: 'alert',
            },
            {
              toastLifeTimeMs: tenDays,
            }
          );
        } else if (!showAlert && this.alertToast) {
          notifications.toasts.remove(this.alertToast);
          this.alertToast = undefined;
        }
      });
  }

  private getSecurityCheckupState(http: HttpStart) {
    return http.anonymousPaths.isAnonymous(window.location.pathname)
      ? Promise.resolve(DEFAULT_SECURITY_CHECKUP_STATE)
      : http
          .get<SecurityCheckupState>('/internal/security/security_checkup/state')
          .catch(() => DEFAULT_SECURITY_CHECKUP_STATE);
  }

  private setAlertVisibility(show: boolean, persist: boolean) {
    if (!this.enabled) {
      return;
    }
    this.alertVisibility$.next(show);
    if (persist) {
      this.setPersistedVisibilityPreference(show);
    }
  }

  private getPersistedVisibilityPreference() {
    const entry = this.storage.getItem(this.storageKey!) ?? '{}';
    try {
      const { show = true } = JSON.parse(entry);
      return show;
    } catch (e) {
      return true;
    }
  }

  private setPersistedVisibilityPreference(show: boolean) {
    this.storage.setItem(this.storageKey!, JSON.stringify({ show }));
  }
}
