/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LocationDescriptorObject } from 'history';
import { HttpSetup } from 'kibana/public';

import { ApplicationStart } from 'src/core/public';
import { MockUrlService } from 'src/plugins/share/common/mocks';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { sharePluginMock } from '../../../../../../src/plugins/share/public/mocks';
import {
  notificationServiceMock,
  docLinksServiceMock,
  scopedHistoryMock,
  uiSettingsServiceMock,
  applicationServiceMock,
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
