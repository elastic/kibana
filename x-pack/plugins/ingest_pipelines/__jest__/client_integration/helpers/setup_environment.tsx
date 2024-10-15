/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LocationDescriptorObject } from 'history';
import { HttpSetup } from 'kibana/public';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import {
  notificationServiceMock,
  docLinksServiceMock,
  scopedHistoryMock,
} from '../../../../../../src/core/public/mocks';

import { usageCollectionPluginMock } from '../../../../../../src/plugins/usage_collection/public/mocks';

import {
  breadcrumbService,
  documentationService,
  uiMetricService,
  apiService,
} from '../../../public/application/services';

import { init as initHttpRequests } from './http_requests';

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

const appServices = {
  breadcrumbs: breadcrumbService,
  metric: uiMetricService,
  documentation: documentationService,
  api: apiService,
  notifications: notificationServiceMock.createSetupContract(),
  history,
  urlGenerators: {
    getUrlGenerator: jest.fn().mockReturnValue({
      createUrl: jest.fn(),
    }),
  },
};

export const setupEnvironment = () => {
  documentationService.setup(docLinksServiceMock.createStartContract());
  breadcrumbService.setup(() => {});

  return initHttpRequests();
};

export const WithAppDependencies = (Comp: any, httpSetup: HttpSetup) => (props: any) => {
  uiMetricService.setup(usageCollectionPluginMock.createSetupContract());
  apiService.setup(httpSetup, uiMetricService);

  return (
    <KibanaContextProvider services={appServices}>
      <Comp {...props} />
    </KibanaContextProvider>
  );
};
