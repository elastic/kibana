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
} from '../../../../../src/core/public/mocks';
import { HttpSetup } from '../../../../../src/core/public';

import { mockKibanaSemverVersion, UA_READONLY_MODE } from '../../common/constants';
import { AppContextProvider } from '../../public/application/app_context';
import { init as initHttpRequests } from './http_requests';
import { apiService } from '../../public/application/lib/api';
import { breadcrumbService } from '../../public/application/lib/breadcrumbs';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const WithAppDependencies = (Comp: any, overrides: Record<string, unknown> = {}) => (
  props: Record<string, unknown>
) => {
  apiService.setup((mockHttpClient as unknown) as HttpSetup);
  breadcrumbService.setup(() => '');

  const contextValue = {
    http: (mockHttpClient as unknown) as HttpSetup,
    isCloudEnabled: false,
    docLinks: docLinksServiceMock.createStartContract(),
    kibanaVersionInfo: {
      currentMajor: mockKibanaSemverVersion.major,
      prevMajor: mockKibanaSemverVersion.major - 1,
      nextMajor: mockKibanaSemverVersion.major + 1,
    },
    isReadOnlyMode: UA_READONLY_MODE,
    notifications: notificationServiceMock.createStartContract(),
    api: apiService,
    breadcrumbs: breadcrumbService,
    getUrlForApp: () => '',
    deprecations: deprecationsServiceMock.createStartContract(),
  };

  return (
    <AppContextProvider value={{ ...contextValue, ...overrides }}>
      <Comp {...props} />
    </AppContextProvider>
  );
};

export const setupEnvironment = () => {
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
