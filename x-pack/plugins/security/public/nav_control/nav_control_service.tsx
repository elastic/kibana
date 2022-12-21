/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import type { FunctionComponent } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import type { SecurityLicense } from '../../common/licensing';
import type { AuthenticationServiceSetup } from '../authentication';
import type { SecurityApiClients } from '../components';
import { AuthenticationProvider, SecurityApiClientsProvider } from '../components';
import type { UserMenuLink } from './nav_control_component';
import { SecurityNavControl } from './nav_control_component';

interface SetupDeps {
  securityLicense: SecurityLicense;
  logoutUrl: string;
  securityApiClients: SecurityApiClients;
}

interface StartDeps {
  core: CoreStart;
  authc: AuthenticationServiceSetup;
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
  private securityApiClients!: SecurityApiClients;

  private navControlRegistered!: boolean;

  private securityFeaturesSubscription?: Subscription;

  private readonly stop$ = new ReplaySubject<void>(1);
  private userMenuLinks$ = new BehaviorSubject<UserMenuLink[]>([]);

  public setup({ securityLicense, logoutUrl, securityApiClients }: SetupDeps) {
    this.securityLicense = securityLicense;
    this.logoutUrl = logoutUrl;
    this.securityApiClients = securityApiClients;
  }

  public start({ core, authc }: StartDeps): SecurityNavControlServiceStart {
    this.securityFeaturesSubscription = this.securityLicense.features$.subscribe(
      ({ showLinks }) => {
        const isAnonymousPath = core.http.anonymousPaths.isAnonymous(window.location.pathname);

        const shouldRegisterNavControl =
          !isAnonymousPath && showLinks && !this.navControlRegistered;
        if (shouldRegisterNavControl) {
          this.registerSecurityNavControl(core, authc);
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

  private registerSecurityNavControl(core: CoreStart, authc: AuthenticationServiceSetup) {
    const { theme$ } = core.theme;
    core.chrome.navControls.registerRight({
      order: 2000,
      mount: (element: HTMLElement) => {
        ReactDOM.render(
          <Providers
            services={core}
            authc={authc}
            theme$={theme$}
            securityApiClients={this.securityApiClients}
          >
            <SecurityNavControl
              editProfileUrl={core.http.basePath.prepend('/security/account')}
              logoutUrl={this.logoutUrl}
              userMenuLinks$={this.userMenuLinks$}
            />
          </Providers>,
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

export interface ProvidersProps {
  authc: AuthenticationServiceSetup;
  services: CoreStart;
  securityApiClients: SecurityApiClients;
  theme$: Observable<CoreTheme>;
}

export const Providers: FunctionComponent<ProvidersProps> = ({
  authc,
  services,
  theme$,
  securityApiClients,
  children,
}) => (
  <KibanaContextProvider services={services}>
    <AuthenticationProvider authc={authc}>
      <SecurityApiClientsProvider {...securityApiClients}>
        <I18nProvider>
          <KibanaThemeProvider theme$={theme$}>
            <RedirectAppLinks coreStart={services}>{children}</RedirectAppLinks>
          </KibanaThemeProvider>
        </I18nProvider>
      </SecurityApiClientsProvider>
    </AuthenticationProvider>
  </KibanaContextProvider>
);
