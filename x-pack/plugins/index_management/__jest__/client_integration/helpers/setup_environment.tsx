/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { merge } from 'lodash';
import SemVer from 'semver/classes/semver';

import { HttpSetup } from '@kbn/core/public';
import {
  notificationServiceMock,
  docLinksServiceMock,
  uiSettingsServiceMock,
  executionContextServiceMock,
} from '@kbn/core/public/mocks';
import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';

import { MAJOR_VERSION } from '../../../common';
import { AppContextProvider } from '../../../public/application/app_context';
import { httpService } from '../../../public/application/services/http';
import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { documentationService } from '../../../public/application/services/documentation';
import { notificationService } from '../../../public/application/services/notification';
import { ExtensionsService } from '../../../public/services';
import { UiMetricService } from '../../../public/application/services/ui_metric';
import { setUiMetricService } from '../../../public/application/services/api';
import { setExtensionsService } from '../../../public/application/store/selectors/extension_service';
import {
  MappingsEditorProvider,
  ComponentTemplatesProvider,
} from '../../../public/application/components';
import { componentTemplatesMockDependencies } from '../../../public/application/components/component_templates/__jest__';
import { init as initHttpRequests } from './http_requests';

const { GlobalFlyoutProvider } = GlobalFlyout;

export const services = {
  extensionsService: new ExtensionsService(),
  uiMetricService: new UiMetricService('index_management'),
};

services.uiMetricService.setup({ reportUiCounter() {} } as any);
setExtensionsService(services.extensionsService);
setUiMetricService(services.uiMetricService);

const appDependencies = {
  services,
  core: {
    getUrlForApp: () => {},
    executionContext: executionContextServiceMock.createStartContract(),
  },
  plugins: {},
} as any;

export const kibanaVersion = new SemVer(MAJOR_VERSION);

const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

export const setupEnvironment = () => {
  breadcrumbService.setup(() => undefined);
  documentationService.setup(docLinksServiceMock.createStartContract());
  notificationService.setup(notificationServiceMock.createSetupContract());

  return initHttpRequests();
};

export const WithAppDependencies =
  (Comp: any, httpSetup: HttpSetup, overridingDependencies: any = {}) =>
  (props: any) => {
    httpService.setup(httpSetup);
    const mergedDependencies = merge({}, appDependencies, overridingDependencies);

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
