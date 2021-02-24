/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';
import { History } from 'history';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { StartServicesAccessor, CoreStart } from '../../../../../../src/core/public';
import { RegisterManagementAppArgs } from '../../../../../../src/plugins/management/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { AuthenticationServiceSetup } from '../../authentication';
import { PluginStartDependencies } from '../../plugin';
import {
  BreadcrumbsProvider,
  BreadcrumbsChangeHandler,
  Breadcrumb,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import { AuthenticationProvider } from '../../components/use_current_user';

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
      async mount({ element, setBreadcrumbs, history }) {
        const [[coreStart], { APIKeysGridPage }, { APIKeysAPIClient }] = await Promise.all([
          getStartServices(),
          import('./api_keys_grid'),
          import('./api_keys_api_client'),
        ]);

        render(
          <Providers
            services={coreStart}
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
  history: History;
  authc: AuthenticationServiceSetup;
  onChange?: BreadcrumbsChangeHandler;
}

export const Providers: FunctionComponent<ProvidersProps> = ({
  services,
  history,
  authc,
  onChange,
  children,
}) => (
  <KibanaContextProvider services={services}>
    <AuthenticationProvider authc={authc}>
      <I18nProvider>
        <Router history={history}>
          <BreadcrumbsProvider onChange={onChange}>{children}</BreadcrumbsProvider>
        </Router>
      </I18nProvider>
    </AuthenticationProvider>
  </KibanaContextProvider>
);
