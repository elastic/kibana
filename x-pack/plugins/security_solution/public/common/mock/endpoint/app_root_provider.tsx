/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useMemo } from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from 'react-router-dom';
import type { History } from 'history';
import useObservable from 'react-use/lib/useObservable';
import type { Store } from 'redux';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { RouteCapture } from '../../components/endpoint/route_capture';
import type { StartPlugins } from '../../../types';

/**
 * Provides the context for rendering the endpoint app
 */
export const AppRootProvider = memo<{
  store: Store;
  history: History;
  coreStart: CoreStart;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
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
    const services = useMemo(
      () => ({ http, notifications, application, data }),
      [application, data, http, notifications]
    );
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

AppRootProvider.displayName = 'AppRootProvider';
