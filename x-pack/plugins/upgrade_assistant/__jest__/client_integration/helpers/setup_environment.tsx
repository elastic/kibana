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

import {
  deprecationsServiceMock,
  docLinksServiceMock,
  notificationServiceMock,
  applicationServiceMock,
} from 'src/core/public/mocks';
import { HttpSetup } from 'src/core/public';

import { KibanaContextProvider } from '../../../public/shared_imports';
import { mockKibanaSemverVersion } from '../../../common/constants';
import { AppContextProvider } from '../../../public/application/app_context';
import { apiService } from '../../../public/application/lib/api';
import { breadcrumbService } from '../../../public/application/lib/breadcrumbs';
import { GlobalFlyout } from '../../../public/shared_imports';
import { kibanaContextMock } from './kibana_context.mock';
import { getAppContextMock } from './app_context.mock';
import { init as initHttpRequests } from './http_requests';

const { GlobalFlyoutProvider } = GlobalFlyout;

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const WithAppDependencies = (Comp: any, overrides: Record<string, unknown> = {}) => (
  props: Record<string, unknown>
) => {
  apiService.setup((mockHttpClient as unknown) as HttpSetup);
  breadcrumbService.setup(() => '');

  const appContextMock = getAppContextMock(mockHttpClient);

  const { kibanaContextOverrides, ...appContextOverrides } = overrides;

  return (
    <KibanaContextProvider services={{ ...kibanaContextMock, ...(kibanaContextOverrides as {}) }}>
      <AppContextProvider value={{ ...appContextMock, ...appContextOverrides }}>
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
