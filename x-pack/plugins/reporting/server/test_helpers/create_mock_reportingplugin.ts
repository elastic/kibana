/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../routes');
jest.mock('../usage');
jest.mock('../browsers');
jest.mock('../lib/create_queue');
jest.mock('../lib/enqueue_job');
jest.mock('../lib/validate');

import * as Rx from 'rxjs';
import { ReportingConfig, ReportingCore } from '../';
import {
  chromium,
  HeadlessChromiumDriverFactory,
  initializeBrowserDriverFactory,
} from '../browsers';
import { ReportingInternalSetup, ReportingInternalStart } from '../core';
import { ReportingStartDeps } from '../types';
import { ReportingStore } from '../lib';
import { createMockLevelLogger } from './create_mock_levellogger';

(initializeBrowserDriverFactory as jest.Mock<
  Promise<HeadlessChromiumDriverFactory>
>).mockImplementation(() => Promise.resolve({} as HeadlessChromiumDriverFactory));

(chromium as any).createDriverFactory.mockImplementation(() => ({}));

const createMockPluginSetup = (setupMock?: any): ReportingInternalSetup => {
  return {
    elasticsearch: setupMock.elasticsearch || { legacy: { client: {} } },
    basePath: setupMock.basePath,
    router: setupMock.router,
    security: setupMock.security,
    licensing: { license$: Rx.of({ isAvailable: true, isActive: true, type: 'basic' }) } as any,
  };
};

const createMockPluginStart = (
  mockReportingCore: ReportingCore,
  startMock?: any
): ReportingInternalStart => {
  const logger = createMockLevelLogger();
  const store = new ReportingStore(mockReportingCore, logger);
  return {
    browserDriverFactory: startMock.browserDriverFactory,
    enqueueJob: startMock.enqueueJob,
    esqueue: startMock.esqueue,
    savedObjects: startMock.savedObjects || { getScopedClient: jest.fn() },
    uiSettings: startMock.uiSettings || { asScopedToClient: () => ({ get: jest.fn() }) },
    store,
  };
};

export const createMockConfigSchema = (overrides?: any) => ({
  index: '.reporting',
  kibanaServer: { hostname: 'localhost', port: '80' },
  capture: { browser: { chromium: { disableSandbox: true } } },
  ...overrides,
});

export const createMockStartDeps = (startMock?: any): ReportingStartDeps => ({
  data: startMock.data,
});

export const createMockReportingCore = async (
  config: ReportingConfig,
  setupDepsMock: ReportingInternalSetup | undefined = undefined,
  startDepsMock: ReportingInternalStart | undefined = undefined
) => {
  if (!setupDepsMock) {
    setupDepsMock = createMockPluginSetup({});
  }

  const mockReportingCore = {
    getConfig: () => config,
    getElasticsearchService: () => setupDepsMock?.elasticsearch,
  } as ReportingCore;

  if (!startDepsMock) {
    startDepsMock = createMockPluginStart(mockReportingCore, {});
  }

  config = config || {};
  const core = new ReportingCore();

  core.pluginSetup(setupDepsMock);
  core.setConfig(config);
  await core.pluginSetsUp();

  core.pluginStart(startDepsMock);
  await core.pluginStartsUp();

  return core;
};
