/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HttpStart as Http, ToastsSetup, I18nStart } from '@kbn/core/public';
import { RouteComponentProps } from 'react-router-dom';

import { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import { LicenseStatus } from '../../common';
import { KibanaRenderContextProvider } from '../shared_imports';
import { App } from './app';
import { AppContextProvider } from './contexts/app_context';
import { ProfileContextProvider } from './contexts/profiler_context';

interface AppDependencies {
  el: HTMLElement;
  http: Http;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  notifications: ToastsSetup;
  initialLicenseStatus: LicenseStatus;
  location: RouteComponentProps['location'];
}

export const renderApp = ({
  el,
  http,
  i18n,
  notifications,
  initialLicenseStatus,
  theme,
  location,
}: AppDependencies) => {
  render(
    <KibanaRenderContextProvider {...{ theme, i18n }}>
      <AppContextProvider args={{ initialLicenseStatus, notifications, http, location }}>
        <ProfileContextProvider>
          <App />
        </ProfileContextProvider>
      </AppContextProvider>
    </KibanaRenderContextProvider>,
    el
  );

  return () => unmountComponentAtNode(el);
};
