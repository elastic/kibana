/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { Observable, Subscription, BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { CoreStart } from 'src/core/public';

import ReactDOM from 'react-dom';
import React from 'react';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';
import { SecurityLicense } from '../../common/licensing';
import { SecurityNavControl, UserMenuLink } from './nav_control_component';
import { AuthenticationServiceSetup } from '../authentication';

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
   * Returns an Observable of the array of user menu links registered by other plugins
   */
  getUserMenuLinks$: () => Observable<UserMenuLink[]>;

  /**
   * Registers the provided user menu links to be displayed in the user menu in the global nav
   */
  addUserMenuLinks: (newUserMenuLink: UserMenuLink[]) => void;
}

export class SecurityNavControlService {
  private securityLicense!: SecurityLicense;
  private authc!: AuthenticationServiceSetup;
  private logoutUrl!: string;

  private navControlRegistered!: boolean;

  private securityFeaturesSubscription?: Subscription;

  private readonly stop$ = new ReplaySubject(1);
  private userMenuLinks$ = new BehaviorSubject<UserMenuLink[]>([]);

  public setup({ securityLicense, authc, logoutUrl }: SetupDeps) {
    this.securityLicense = securityLicense;
    this.authc = authc;
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
    core: Pick<CoreStart, 'chrome' | 'http' | 'i18n' | 'injectedMetadata' | 'application'>
  ) {
    const currentUserPromise = this.authc.getCurrentUser();
    core.chrome.navControls.registerRight({
      order: 2000,
      mount: (el: HTMLElement) => {
        const I18nContext = core.i18n.Context;

        const props = {
          user: currentUserPromise,
          editProfileUrl: core.http.basePath.prepend('/security/account'),
          logoutUrl: this.logoutUrl,
          userMenuLinks$: this.userMenuLinks$,
        };
        ReactDOM.render(
          <I18nContext>
            <RedirectAppLinks application={core.application}>
              <SecurityNavControl {...props} />
            </RedirectAppLinks>
          </I18nContext>,
          el
        );

        return () => ReactDOM.unmountComponentAtNode(el);
      },
    });

    this.navControlRegistered = true;
  }

  private sortUserMenuLinks(userMenuLinks: UserMenuLink[]) {
    return sortBy(userMenuLinks, 'order');
  }
}
