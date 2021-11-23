/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useMemo } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { Router } from 'react-router-dom';
import { History } from 'history';
import useObservable from 'react-use/lib/useObservable';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../src/core/public';

/**
 * Provides the context for rendering the endpoint app
 */
export const AppRootProvider = memo<{
  history: History;
  coreStart: CoreStart;
  children: ReactNode | ReactNode[];
}>(({ history, coreStart: { http, notifications, uiSettings, application }, children }) => {
  const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));
  const services = useMemo(
    () => ({ http, notifications, application }),
    [application, http, notifications]
  );
  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <EuiThemeProvider darkMode={isDarkMode}>
          <Router history={history}>{children}</Router>
        </EuiThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
});

AppRootProvider.displayName = 'AppRootProvider';
