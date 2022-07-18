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

import type { CoreStart, CoreTheme, StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';

import type { AuthenticationServiceSetup } from '../../authentication';
import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import { AuthenticationProvider } from '../../components/use_current_user';
import type { PluginStartDependencies } from '../../plugin';

interface CreateParams {
  authc: AuthenticationServiceSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const apiKeysManagementApp = Object.freeze({
  id: 'api_keys',
  create({ authc, getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 30,
      title: i18n.translate('xpack.security.management.apiKeysTitle', {
        defaultMessage: 'API keys',
      }),
      async mount({ element, theme$, setBreadcrumbs, history }) {
        const [[coreStart], { APIKeysGridPage }, { APIKeysAPIClient }] = await Promise.all([
          getStartServices(),
          import('./api_keys_grid'),
          import('./api_keys_api_client'),
        ]);

        render(
          <Providers
            services={coreStart}
            theme$={theme$}
            history={history}
            authc={authc}
            onChange={createBreadcrumbsChangeHandler(coreStart.chrome, setBreadcrumbs)}
          >
            <Breadcrumb
              text={i18n.translate('xpack.security.management.apiKeysTitle', {
                defaultMessage: 'API keys',
              })}
              href="/"
            >
              <APIKeysGridPage
                history={history}
                notifications={coreStart.notifications}
                apiKeysAPIClient={new APIKeysAPIClient(coreStart.http)}
              />
            </Breadcrumb>
          </Providers>,
          element
        );

        return () => {
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
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
