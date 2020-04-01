/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, ReactNode, useMemo } from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { Router } from 'react-router-dom';
import { History } from 'history';
import { CoreStart } from 'kibana/public';
import { useObservable } from 'react-use';
import { EuiThemeProvider } from '../../../../../../legacy/common/eui_styled_components';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { appStoreFactory } from '../store';
import { RouteCapture } from './route_capture';
import { EndpointPluginStartDependencies } from '../../../plugin';

/**
 * Provides the context for rendering the endpoint app
 */
export const AppRootProvider = memo<{
  store: ReturnType<typeof appStoreFactory>;
  history: History;
  coreStart: CoreStart;
  depsStart: EndpointPluginStartDependencies;
  children: ReactNode | ReactNode[];
}>(
  ({
    store,
    history,
    coreStart: { http, notifications, uiSettings, application },
    depsStart: { data },
    children,
  }) => {
    const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));
    const services = useMemo(() => ({ http, notifications, application, data }), [
      application,
      data,
      http,
      notifications,
    ]);
    return (
      <Provider store={store}>
        <I18nProvider>
          <KibanaContextProvider services={services}>
            <EuiThemeProvider darkMode={isDarkMode}>
              <Router history={history}>
                <RouteCapture>{children}</RouteCapture>
              </Router>
            </EuiThemeProvider>
          </KibanaContextProvider>
        </I18nProvider>
      </Provider>
    );
  }
);
