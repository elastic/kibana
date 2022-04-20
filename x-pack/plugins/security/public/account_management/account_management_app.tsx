/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { FunctionComponent } from 'react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';
import type { Observable } from 'rxjs';

import type {
  ApplicationSetup,
  AppMountParameters,
  CoreStart,
  CoreTheme,
  StartServicesAccessor,
} from '@kbn/core/public';
import { AppNavLinkStatus } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import type { AuthenticationServiceSetup } from '../authentication';
import type { BreadcrumbsChangeHandler } from '../components/breadcrumb';
import { BreadcrumbsProvider } from '../components/breadcrumb';
import { AuthenticationProvider } from '../components/use_current_user';

interface CreateDeps {
  application: ApplicationSetup;
  authc: AuthenticationServiceSetup;
  getStartServices: StartServicesAccessor;
}

export const accountManagementApp = Object.freeze({
  id: 'security_account',
  create({ application, authc, getStartServices }: CreateDeps) {
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.account.breadcrumb', {
        defaultMessage: 'User settings',
      }),
      navLinkStatus: AppNavLinkStatus.hidden,
      appRoute: '/security/account',
      async mount({ element, theme$, history }: AppMountParameters) {
        const [[coreStart], { AccountManagementPage }] = await Promise.all([
          getStartServices(),
          import('./account_management_page'),
        ]);

        render(
          <Providers services={coreStart} theme$={theme$} history={history} authc={authc}>
            <AccountManagementPage />
          </Providers>,
          element
        );

        return () => unmountComponentAtNode(element);
      },
    });
  },
});

export interface ProvidersProps {
  services: CoreStart;
  theme$: Observable<CoreTheme>;
  history: History;
  authc: AuthenticationServiceSetup;
  onChange?: BreadcrumbsChangeHandler;
}

export const Providers: FunctionComponent<ProvidersProps> = ({
  services,
  theme$,
  history,
  authc,
  onChange,
  children,
}) => (
  <KibanaContextProvider services={services}>
    <AuthenticationProvider authc={authc}>
      <I18nProvider>
        <KibanaThemeProvider theme$={theme$}>
          <Router history={history}>
            <BreadcrumbsProvider onChange={onChange}>{children}</BreadcrumbsProvider>
          </Router>
        </KibanaThemeProvider>
      </I18nProvider>
    </AuthenticationProvider>
  </KibanaContextProvider>
);
