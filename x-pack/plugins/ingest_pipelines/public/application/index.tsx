/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HttpSetup, NotificationsSetup, IUiSettingsClient, ChromeStart } from 'kibana/public';
import { ManagementAppMountParams } from 'src/plugins/management/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

import { API_BASE_PATH, PLUGIN_I18N_NAME } from '../../common/constants';

import { AuthorizationProvider } from '../shared_imports';

import { App } from './app';
import { DocumentationService, UiMetricService, ApiService, BreadcrumbService } from './services';

export interface AppServices {
  breadcrumbs: BreadcrumbService;
  metric: UiMetricService;
  documentation: DocumentationService;
  api: ApiService;
  notifications: NotificationsSetup;
  history: ManagementAppMountParams['history'];
  uiSettings: IUiSettingsClient;
}

export interface CoreServices {
  http: HttpSetup;
  chrome: ChromeStart;
}

export const renderApp = (
  element: HTMLElement,
  I18nContext: ({ children }: { children: ReactNode }) => JSX.Element,
  services: AppServices,
  coreServices: CoreServices
) => {
  coreServices.chrome.docTitle.change(PLUGIN_I18N_NAME);
  render(
    <AuthorizationProvider
      privilegesEndpoint={`${API_BASE_PATH}/privileges`}
      httpClient={coreServices.http}
    >
      <I18nContext>
        <KibanaContextProvider services={services}>
          <App />
        </KibanaContextProvider>
      </I18nContext>
    </AuthorizationProvider>,
    element
  );

  return () => {
    coreServices.chrome.docTitle.reset();
    unmountComponentAtNode(element);
  };
};
