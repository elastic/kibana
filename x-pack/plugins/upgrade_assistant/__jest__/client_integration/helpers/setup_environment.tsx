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

import { HttpSetup } from 'src/core/public';
import { MAJOR_VERSION } from '../../../common/constants';

import { AuthorizationContext, Authorization, Privileges } from '../../../public/shared_imports';
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

const createAuthorizationContextValue = (privileges: Privileges) => {
  return {
    isLoading: false,
    privileges: privileges ?? { hasAllPrivileges: false, missingPrivileges: {} },
  } as Authorization;
};

export const WithAppDependencies =
  (Comp: any, { privileges, ...overrides }: Record<string, unknown> = {}) =>
  (props: Record<string, unknown>) => {
    apiService.setup(mockHttpClient as unknown as HttpSetup);
    breadcrumbService.setup(() => '');

    const appContextMock = getAppContextMock() as unknown as AppDependencies;

    return (
      <AuthorizationContext.Provider
        value={createAuthorizationContextValue(privileges as Privileges)}
      >
        <AppContextProvider value={merge(appContextMock, overrides)}>
          <GlobalFlyoutProvider>
            <Comp {...props} />
          </GlobalFlyoutProvider>
        </AppContextProvider>
      </AuthorizationContext.Provider>
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
