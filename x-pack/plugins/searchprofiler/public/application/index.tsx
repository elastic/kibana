/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { HttpStart as Http, ToastsSetup, CoreTheme } from '@kbn/core/public';
import { RouteComponentProps } from 'react-router-dom';

import { LicenseStatus } from '../../common';
import { KibanaThemeProvider } from '../shared_imports';
import { App } from './app';
import { AppContextProvider } from './contexts/app_context';
import { ProfileContextProvider } from './contexts/profiler_context';

interface AppDependencies {
  el: HTMLElement;
  http: Http;
  I18nContext: any;
  notifications: ToastsSetup;
  initialLicenseStatus: LicenseStatus;
  theme$: Observable<CoreTheme>;
  location: RouteComponentProps['location'];
}

export const renderApp = ({
  el,
  http,
  I18nContext,
  notifications,
  initialLicenseStatus,
  theme$,
  location,
}: AppDependencies) => {
  render(
    <I18nContext>
      <KibanaThemeProvider theme$={theme$}>
        <AppContextProvider args={{ initialLicenseStatus, notifications, http, location }}>
          <ProfileContextProvider>
            <App />
          </ProfileContextProvider>
        </AppContextProvider>
      </KibanaThemeProvider>
    </I18nContext>,
    el
  );

  return () => unmountComponentAtNode(el);
};
