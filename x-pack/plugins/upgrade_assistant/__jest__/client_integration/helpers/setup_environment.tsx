/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import axios from 'axios';
// @ts-ignore
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import SemVer from 'semver/classes/semver';
import {
  deprecationsServiceMock,
  docLinksServiceMock,
  notificationServiceMock,
  applicationServiceMock,
} from 'src/core/public/mocks';
import { HttpSetup } from 'src/core/public';

import { KibanaContextProvider } from '../../../public/shared_imports';
import { MAJOR_VERSION } from '../../../common/constants';
import { AppContextProvider } from '../../../public/application/app_context';
import { apiService } from '../../../public/application/lib/api';
import { breadcrumbService } from '../../../public/application/lib/breadcrumbs';
import { GlobalFlyout } from '../../../public/shared_imports';
import { servicesMock } from './services_mock';
import { init as initHttpRequests } from './http_requests';

const { GlobalFlyoutProvider } = GlobalFlyout;

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const kibanaVersion = new SemVer(MAJOR_VERSION);

export const WithAppDependencies =
  (Comp: any, overrides: Record<string, unknown> = {}) =>
  (props: Record<string, unknown>) => {
    apiService.setup(mockHttpClient as unknown as HttpSetup);
    breadcrumbService.setup(() => '');

    const contextValue = {
      http: mockHttpClient as unknown as HttpSetup,
      docLinks: docLinksServiceMock.createStartContract(),
      kibanaVersionInfo: {
        currentMajor: kibanaVersion.major,
        prevMajor: kibanaVersion.major - 1,
        nextMajor: kibanaVersion.major + 1,
      },
      notifications: notificationServiceMock.createStartContract(),
      isReadOnlyMode: false,
      api: apiService,
      breadcrumbs: breadcrumbService,
      getUrlForApp: applicationServiceMock.createStartContract().getUrlForApp,
      deprecations: deprecationsServiceMock.createStartContract(),
    };

    const { servicesOverrides, ...contextOverrides } = overrides;

    return (
      <KibanaContextProvider services={{ ...servicesMock, ...(servicesOverrides as {}) }}>
        <AppContextProvider value={{ ...contextValue, ...contextOverrides }}>
          <GlobalFlyoutProvider>
            <Comp {...props} />
          </GlobalFlyoutProvider>
        </AppContextProvider>
      </KibanaContextProvider>
    );
  };

export const setupEnvironment = () => {
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
