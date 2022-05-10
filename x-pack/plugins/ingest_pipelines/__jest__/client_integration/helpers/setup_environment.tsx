/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LocationDescriptorObject } from 'history';
import { HttpSetup } from '@kbn/core/public';

import { ApplicationStart } from '@kbn/core/public';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import {
  notificationServiceMock,
  docLinksServiceMock,
  scopedHistoryMock,
  uiSettingsServiceMock,
  applicationServiceMock,
} from '@kbn/core/public/mocks';

import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';

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

const applicationMock = {
  ...applicationServiceMock.createStartContract(),
  capabilities: {
    dev_tools: {
      show: true,
    },
  },
} as any as ApplicationStart;

const appServices = {
  breadcrumbs: breadcrumbService,
  metric: uiMetricService,
  documentation: documentationService,
  api: apiService,
  fileReader: {
    readFile: jest.fn((file) => file.text()),
  },
  notifications: notificationServiceMock.createSetupContract(),
  history,
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  url: sharePluginMock.createStartContract().url,
  fileUpload: {
    getMaxBytes: jest.fn().mockReturnValue(100),
    getMaxBytesFormatted: jest.fn().mockReturnValue('100'),
  },
  application: applicationMock,
  share: {
    url: new MockUrlService(),
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
