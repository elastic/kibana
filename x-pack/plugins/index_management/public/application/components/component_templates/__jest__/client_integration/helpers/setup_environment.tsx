/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @kbn/eslint/no-restricted-paths */
import React from 'react';

import { BASE_PATH, API_BASE_PATH } from '../../../../../../../common/constants';
import {
  notificationServiceMock,
  fatalErrorsServiceMock,
  docLinksServiceMock,
  injectedMetadataServiceMock,
} from '../../../../../../../../../../src/core/public/mocks';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { HttpService } from '../../../../../../../../../../src/core/public/http';

import { init as initHttpRequests } from './http_requests';
import { ComponentTemplatesProvider } from '../../../component_templates_context';

const httpServiceSetupMock = new HttpService().setup({
  injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
  fatalErrors: fatalErrorsServiceMock.createSetupContract(),
});

const appDependencies = {
  httpClient: httpServiceSetupMock,
  apiBasePath: API_BASE_PATH,
  appBasePath: BASE_PATH,
  trackMetric: () => {},
  docLinks: docLinksServiceMock.createStartContract(),
  toasts: notificationServiceMock.createSetupContract().toasts,
};

export const setupEnvironment = () => {
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};

export const WithAppDependencies = (Comp: any) => (props: any) => (
  <ComponentTemplatesProvider value={appDependencies}>
    <Comp {...props} />
  </ComponentTemplatesProvider>
);
