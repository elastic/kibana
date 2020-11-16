/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HttpStart as Http, ToastsSetup } from 'kibana/public';

import { LicenseStatus } from '../../common';
import { App } from './app';
import { AppContextProvider } from './contexts/app_context';
import { ProfileContextProvider } from './contexts/profiler_context';

interface AppDependencies {
  el: HTMLElement;
  http: Http;
  I18nContext: any;
  notifications: ToastsSetup;
  initialLicenseStatus: LicenseStatus;
}

export const renderApp = ({
  el,
  http,
  I18nContext,
  notifications,
  initialLicenseStatus,
}: AppDependencies) => {
  render(
    <I18nContext>
      <AppContextProvider args={{ initialLicenseStatus, notifications, http }}>
        <ProfileContextProvider>
          <App />
        </ProfileContextProvider>
      </AppContextProvider>
    </I18nContext>,
    el
  );

  return () => unmountComponentAtNode(el);
};
