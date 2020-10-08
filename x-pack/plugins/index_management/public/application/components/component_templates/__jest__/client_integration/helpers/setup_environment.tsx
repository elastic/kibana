/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { HttpSetup } from 'kibana/public';
import {
  notificationServiceMock,
  docLinksServiceMock,
  applicationServiceMock,
} from '../../../../../../../../../../src/core/public/mocks';

import { GlobalFlyout } from '../../../../../../../../../../src/plugins/es_ui_shared/public';
import { MappingsEditorProvider } from '../../../../mappings_editor';
import { ComponentTemplatesProvider } from '../../../component_templates_context';

import { init as initHttpRequests } from './http_requests';
import { API_BASE_PATH } from './constants';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });
const { GlobalFlyoutProvider } = GlobalFlyout;

export const appDependencies = {
  httpClient: (mockHttpClient as unknown) as HttpSetup,
  apiBasePath: API_BASE_PATH,
  trackMetric: () => {},
  docLinks: docLinksServiceMock.createStartContract(),
  toasts: notificationServiceMock.createSetupContract().toasts,
  setBreadcrumbs: () => {},
  getUrlForApp: applicationServiceMock.createStartContract().getUrlForApp,
};

export const setupEnvironment = () => {
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};

export const WithAppDependencies = (Comp: any) => (props: any) => (
  <MappingsEditorProvider>
    <ComponentTemplatesProvider value={appDependencies}>
      <GlobalFlyoutProvider>
        <Comp {...props} />
      </GlobalFlyoutProvider>
    </ComponentTemplatesProvider>
  </MappingsEditorProvider>
);
