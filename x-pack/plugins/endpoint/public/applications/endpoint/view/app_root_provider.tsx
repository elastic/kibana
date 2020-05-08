/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, ReactNode, useMemo, useContext } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { useObservable } from 'react-use';
import { EuiThemeProvider } from '../../../../../../legacy/common/eui_styled_components';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { SubpluginDependenciesContext } from './app_root';

/**
 * Provides the context for rendering the endpoint app
 */
// TODO: Eventually put this in each subplugin
export const AppRootProvider = memo(({ children }: { children: ReactNode | ReactNode[] }) => {
  const context = useContext(SubpluginDependenciesContext)!; // TODO: maybe revisit null assertion
  const {
    coreStart: { http, notifications, uiSettings, application },
    depsStart: { data },
  } = context;
  const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));
  const services = useMemo(() => ({ http, notifications, application, data }), [
    application,
    data,
    http,
    notifications,
  ]);
  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <EuiThemeProvider darkMode={isDarkMode}>{children}</EuiThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
});
