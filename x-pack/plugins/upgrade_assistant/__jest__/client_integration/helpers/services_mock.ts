/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { DiscoverAppLocator } from '../../../../../../src/plugins/discover/public';

const locator: DiscoverAppLocator = {
  getLocation: jest.fn(() =>
    Promise.resolve({
      app: 'discover',
      path: '/',
      state: {},
    })
  ),
  navigate: jest.fn(async () => {}),
  getUrl: jest.fn(),
  useUrl: jest.fn(),
  extract: jest.fn(),
  inject: jest.fn(),
  telemetry: jest.fn(),
  migrations: {},
};

const application = {
  getUrlForApp: (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path}`,
  navigateToApp: jest.fn(),
};

const coreStartMock = coreMock.createStart();

export const servicesMock = {
  application,
  discover: { locator },
  data: dataPluginMock.createStartContract(),
  http: coreStartMock.http,
};
