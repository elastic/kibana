/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, HttpSetup } from '@kbn/core/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ApplicationStart } from '@kbn/core/public';
import { NotificationsSetup, IUiSettingsClient, OverlayStart, HttpStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';

import { KibanaContextProvider, KibanaRenderContextProvider } from '../shared_imports';
import type { Config, ILicense } from '../types';

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
  settings: SettingsStart;
  share: SharePluginStart;
  fileUpload: FileUploadPluginStart;
  application: ApplicationStart;
  license: ILicense | null;
  consolePlugin?: ConsolePluginStart;
  overlays: OverlayStart;
  http: HttpStart;
  config: Config;
}

type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

export interface CoreServices extends StartServices {
  http: HttpSetup;
}

export const renderApp = (
  element: HTMLElement,
  services: AppServices,
  coreServices: CoreServices
) => {
  render(
    <KibanaRenderContextProvider {...coreServices}>
      <AuthorizationProvider
        privilegesEndpoint={`${API_BASE_PATH}/privileges`}
        httpClient={coreServices.http}
      >
        <KibanaContextProvider services={services}>
          <App />
        </KibanaContextProvider>
      </AuthorizationProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
