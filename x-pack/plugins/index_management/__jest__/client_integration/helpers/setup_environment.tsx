/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocationDescriptorObject } from 'history';
import { merge } from 'lodash';
import React from 'react';
import SemVer from 'semver/classes/semver';

import { HttpSetup } from '@kbn/core/public';
import {
  applicationServiceMock,
  docLinksServiceMock,
  executionContextServiceMock,
  fatalErrorsServiceMock,
  httpServiceMock,
  notificationServiceMock,
  scopedHistoryMock,
  themeServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/public/mocks';

import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { MAJOR_VERSION } from '../../../common';
import { AppContextProvider } from '../../../public/application/app_context';
import {
  ComponentTemplatesProvider,
  MappingsEditorProvider,
} from '../../../public/application/components';
import { componentTemplatesMockDependencies } from '../../../public/application/components/component_templates/__jest__';
import { setUiMetricService } from '../../../public/application/services/api';
import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { documentationService } from '../../../public/application/services/documentation';
import { httpService } from '../../../public/application/services/http';
import { notificationService } from '../../../public/application/services/notification';
import { UiMetricService } from '../../../public/application/services/ui_metric';
import { setExtensionsService } from '../../../public/application/store/selectors/extension_service';
import { ExtensionsService } from '../../../public/services';
import { init as initHttpRequests } from './http_requests';

const { GlobalFlyoutProvider } = GlobalFlyout;

export const services = {
  extensionsService: new ExtensionsService(),
  uiMetricService: new UiMetricService('index_management'),
  notificationService: notificationServiceMock.createSetupContract(),
};

services.uiMetricService.setup({ reportUiCounter() {} } as any);
setExtensionsService(services.extensionsService);
setUiMetricService(services.uiMetricService);

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

const appDependencies = {
  services,
  history,
  core: {
    getUrlForApp: applicationServiceMock.createStartContract().getUrlForApp,
    executionContext: executionContextServiceMock.createStartContract(),
    http: httpServiceMock.createSetupContract(),
    application: applicationServiceMock.createStartContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
  },
  plugins: {
    usageCollection: usageCollectionPluginMock.createSetupContract(),
    isFleetEnabled: false,
    share: sharePluginMock.createStartContract(),
  },
  // Default stateful configuration
  config: {
    enableLegacyTemplates: true,
    enableIndexActions: true,
    enableIndexStats: true,
    editableIndexSettings: 'all',
    enableDataStreamsStorageColumn: true,
    enableMappingsSourceFieldSection: true,
    enableTogglingDataRetention: true,
  },
} as any;

export const kibanaVersion = new SemVer(MAJOR_VERSION);

const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  settings: settingsServiceMock.createStartContract(),
  theme: themeServiceMock.createStartContract(),
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

export const setupEnvironment = () => {
  breadcrumbService.setup(() => undefined);
  documentationService.setup(docLinksServiceMock.createStartContract());
  notificationService.setup(notificationServiceMock.createStartContract());

  return initHttpRequests();
};

export const WithAppDependencies =
  (Comp: any, httpSetup: HttpSetup, overridingDependencies: any = {}) =>
  (props: any) => {
    httpService.setup(httpSetup);
    const mergedDependencies = merge(
      {
        services: { httpService },
      },
      appDependencies,
      overridingDependencies
    );
    return (
      <KibanaReactContextProvider>
        <AppContextProvider value={mergedDependencies}>
          <MappingsEditorProvider>
            <ComponentTemplatesProvider value={componentTemplatesMockDependencies(httpSetup)}>
              <GlobalFlyoutProvider>
                <Comp {...props} />
              </GlobalFlyoutProvider>
            </ComponentTemplatesProvider>
          </MappingsEditorProvider>
        </AppContextProvider>
      </KibanaReactContextProvider>
    );
  };
