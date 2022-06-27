/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import React, { ReactNode } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';

import { ApplicationStart } from '@kbn/core/public';
import { NotificationsSetup, IUiSettingsClient, CoreTheme } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '../shared_imports';

import { API_BASE_PATH } from '../../common/constants';

import { AuthorizationProvider } from '../shared_imports';

import { App } from './app';
import {
  DocumentationService,
  UiMetricService,
  ApiService,
  BreadcrumbService,
  FileReaderService,
} from './services';

export interface AppServices {
  breadcrumbs: BreadcrumbService;
  metric: UiMetricService;
  documentation: DocumentationService;
  api: ApiService;
  fileReader: FileReaderService;
  notifications: NotificationsSetup;
  history: ManagementAppMountParams['history'];
  uiSettings: IUiSettingsClient;
  share: SharePluginStart;
  fileUpload: FileUploadPluginStart;
  application: ApplicationStart;
}

export interface CoreServices {
  http: HttpSetup;
}

export const renderApp = (
  element: HTMLElement,
  I18nContext: ({ children }: { children: ReactNode }) => JSX.Element,
  services: AppServices,
  coreServices: CoreServices,
  { theme$ }: { theme$: Observable<CoreTheme> }
) => {
  render(
    <AuthorizationProvider
      privilegesEndpoint={`${API_BASE_PATH}/privileges`}
      httpClient={coreServices.http}
    >
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={services}>
            <App />
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </AuthorizationProvider>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
