/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import axios from 'axios';
import SemVer from 'semver/classes/semver';
import { merge } from 'lodash';
// @ts-ignore
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { MAJOR_VERSION } from '../../../common/constants';
import { HttpSetup } from 'src/core/public';

import { AppContextProvider } from '../../../public/application/app_context';
import { apiService } from '../../../public/application/lib/api';
import { breadcrumbService } from '../../../public/application/lib/breadcrumbs';
import { GlobalFlyout } from '../../../public/shared_imports';
import { AppDependencies } from '../../../public/types';
import { getAppContextMock } from './app_context.mock';
import { init as initHttpRequests } from './http_requests';

const { GlobalFlyoutProvider } = GlobalFlyout;

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const kibanaVersion = new SemVer(MAJOR_VERSION);

export const WithAppDependencies = (Comp: any, overrides: Record<string, unknown> = {}) => (
  props: Record<string, unknown>
) => {
  apiService.setup((mockHttpClient as unknown) as HttpSetup);
  breadcrumbService.setup(() => '');

  const appContextMock = (getAppContextMock() as unknown) as AppDependencies;

  return (
    <AppContextProvider value={merge(appContextMock, overrides)}>
      <GlobalFlyoutProvider>
        <Comp {...props} />
      </GlobalFlyoutProvider>
    </AppContextProvider>
  );
};

export const setupEnvironment = () => {
  const { server, setServerAsync, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    setServerAsync,
    httpRequestsMockHelpers,
  };
};
