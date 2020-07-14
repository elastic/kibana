/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
import React from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { merge } from 'lodash';

import {
  notificationServiceMock,
  docLinksServiceMock,
} from '../../../../../../src/core/public/mocks';
import { AppContextProvider } from '../../../public/application/app_context';
import { httpService } from '../../../public/application/services/http';
import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { documentationService } from '../../../public/application/services/documentation';
import { notificationService } from '../../../public/application/services/notification';
import { ExtensionsService } from '../../../public/services';
import { UiMetricService } from '../../../public/application/services/ui_metric';
import { setUiMetricService } from '../../../public/application/services/api';
import { setExtensionsService } from '../../../public/application/store/selectors';
import { init as initHttpRequests } from './http_requests';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const services = {
  extensionsService: new ExtensionsService(),
  uiMetricService: new UiMetricService('index_management'),
};
services.uiMetricService.setup({ reportUiStats() {} } as any);
setExtensionsService(services.extensionsService);
setUiMetricService(services.uiMetricService);
const appDependencies = {
  services,
  core: { getUrlForApp: () => {} },
  plugins: {},
} as any;

export const setupEnvironment = () => {
  // Mock initialization of services
  // @ts-ignore
  httpService.setup(mockHttpClient);
  breadcrumbService.setup(() => undefined);
  documentationService.setup(docLinksServiceMock.createStartContract());
  notificationService.setup(notificationServiceMock.createSetupContract());

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};

export const WithAppDependencies = (Comp: any, overridingDependencies: any = {}) => (
  props: any
) => {
  const mergedDependencies = merge({}, appDependencies, overridingDependencies);
  return (
    <AppContextProvider value={mergedDependencies}>
      <Comp {...props} />
    </AppContextProvider>
  );
};
