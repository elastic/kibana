/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart } from 'src/core/public';

import {
  KibanaContextProvider,
  KibanaThemeProvider,
} from '../../../../../src/plugins/kibana_react/public';
import type { SecurityLicense } from '../../common/licensing';
import type { AuthenticationServiceSetup } from '../authentication';
import type { UserMenuLink } from './nav_control_component';
import { SecurityNavControl } from './nav_control_component';

interface SetupDeps {
  securityLicense: SecurityLicense;
  authc: AuthenticationServiceSetup;
  logoutUrl: string;
}

interface StartDeps {
  core: CoreStart;
}

export interface SecurityNavControlServiceStart {
  /**
   * Returns an Observable of the array of user menu links (the links that show up under the user's Avatar in the UI) registered by other plugins
   */
  getUserMenuLinks$: () => Observable<UserMenuLink[]>;

  /**
   * Registers the provided user menu links to be displayed in the user menu (the links that show up under the user's Avatar in the UI).
   */
  addUserMenuLinks: (newUserMenuLink: UserMenuLink[]) => void;
}

export class SecurityNavControlService {
  private securityLicense!: SecurityLicense;
  private logoutUrl!: string;

  private navControlRegistered!: boolean;

  private securityFeaturesSubscription?: Subscription;

  private readonly stop$ = new ReplaySubject(1);
  private userMenuLinks$ = new BehaviorSubject<UserMenuLink[]>([]);

  public setup({ securityLicense, logoutUrl }: SetupDeps) {
    this.securityLicense = securityLicense;
    this.logoutUrl = logoutUrl;
  }

  public start({ core }: StartDeps): SecurityNavControlServiceStart {
    this.securityFeaturesSubscription = this.securityLicense.features$.subscribe(
      ({ showLinks }) => {
        const isAnonymousPath = core.http.anonymousPaths.isAnonymous(window.location.pathname);

        const shouldRegisterNavControl =
          !isAnonymousPath && showLinks && !this.navControlRegistered;
        if (shouldRegisterNavControl) {
          this.registerSecurityNavControl(core);
        }
      }
    );

    return {
      getUserMenuLinks$: () =>
        this.userMenuLinks$.pipe(map(this.sortUserMenuLinks), takeUntil(this.stop$)),
      addUserMenuLinks: (userMenuLinks: UserMenuLink[]) => {
        const currentLinks = this.userMenuLinks$.value;
        const hasCustomProfileLink = currentLinks.find(({ setAsProfile }) => setAsProfile === true);
        const passedCustomProfileLinkCount = userMenuLinks.filter(
          ({ setAsProfile }) => setAsProfile === true
        ).length;

        if (hasCustomProfileLink && passedCustomProfileLinkCount > 0) {
          throw new Error(
            `Only one custom profile link can be set. A custom profile link named ${hasCustomProfileLink.label} (${hasCustomProfileLink.href}) already exists`
          );
        }

        if (passedCustomProfileLinkCount > 1) {
          throw new Error(
            `Only one custom profile link can be passed at a time (found ${passedCustomProfileLinkCount})`
          );
        }

        const newLinks = [...currentLinks, ...userMenuLinks];
        this.userMenuLinks$.next(newLinks);
      },
    };
  }

  public stop() {
    if (this.securityFeaturesSubscription) {
      this.securityFeaturesSubscription.unsubscribe();
      this.securityFeaturesSubscription = undefined;
    }
    this.navControlRegistered = false;
    this.stop$.next();
  }

  private registerSecurityNavControl(
    core: Pick<CoreStart, 'chrome' | 'http' | 'i18n' | 'injectedMetadata' | 'application' | 'theme'>
  ) {
    const { theme$ } = core.theme;
    core.chrome.navControls.registerRight({
      order: 2000,
      mount: (element: HTMLElement) => {
        ReactDOM.render(
          <KibanaContextProvider services={core}>
            <I18nProvider>
              <KibanaThemeProvider theme$={theme$}>
                <SecurityNavControl
                  editProfileUrl={core.http.basePath.prepend('/security/account')}
                  logoutUrl={this.logoutUrl}
                  userMenuLinks$={this.userMenuLinks$}
                />
              </KibanaThemeProvider>
            </I18nProvider>
          </KibanaContextProvider>,
          element
        );

        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    this.navControlRegistered = true;
  }

  private sortUserMenuLinks(userMenuLinks: UserMenuLink[]) {
    return sortBy(userMenuLinks, 'order');
  }
}
