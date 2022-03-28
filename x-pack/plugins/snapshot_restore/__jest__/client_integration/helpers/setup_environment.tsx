/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LocationDescriptorObject } from 'history';

import { HttpSetup } from 'src/core/public';
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
  core: coreMock.createStart(),
  services,
  config: {
    slm_ui: { enabled: true },
  },
  plugins: {},
};

export const setupEnvironment = () => {
  breadcrumbService.setup(() => undefined);
  textService.setup(i18n);
  docTitleService.setup(() => undefined);

  return initHttpRequests();
};

/**
 * Suppress error messages about Worker not being available in JS DOM.
 */
(window as any).Worker = function Worker() {
  this.postMessage = () => {};
  this.terminate = () => {};
};

export const WithAppDependencies = (Comp: any, httpSetup: HttpSetup) => (props: any) => {
  httpService.setup(httpSetup);

  return (
    <AppContextProvider value={appDependencies as any}>
      <Comp {...props} />
    </AppContextProvider>
  );
};
