/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @kbn/eslint/no-restricted-paths */
import React from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { i18n } from '@kbn/i18n';
import { LocationDescriptorObject } from 'history';

import { coreMock, scopedHistoryMock } from 'src/core/public/mocks';
import { setUiMetricService, httpService } from '../../../public/application/services/http';
import {
  breadcrumbService,
  docTitleService,
} from '../../../public/application/services/navigation';
import { AppContextProvider } from '../../../public/application/app_context';
import { textService } from '../../../public/application/services/text';
import { init as initHttpRequests } from './http_requests';
import { UiMetricService } from '../../../public/application/services';
import { documentationLinksService } from '../../../public/application/services/documentation';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

export const services = {
  uiMetricService: new UiMetricService('snapshot_restore'),
  httpService,
  i18n,
  history,
};

setUiMetricService(services.uiMetricService);

const appDependencies = {
  core: coreMock.createSetup(),
  services,
  config: {
    slm_ui: { enabled: true },
  },
  plugins: {},
};

export const setupEnvironment = () => {
  // @ts-ignore
  httpService.setup(mockHttpClient);
  breadcrumbService.setup(() => undefined);
  textService.setup(i18n);
  documentationLinksService.setup({} as any);
  docTitleService.setup(() => undefined);

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};

/**
 * Suppress error messages about Worker not being available in JS DOM.
 */
(window as any).Worker = function Worker() {
  this.postMessage = () => {};
  this.terminate = () => {};
};

export const WithAppDependencies = (Comp: any) => (props: any) => (
  <AppContextProvider value={appDependencies as any}>
    <Comp {...props} />
  </AppContextProvider>
);
