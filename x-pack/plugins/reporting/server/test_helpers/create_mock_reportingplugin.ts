/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../routes');
jest.mock('../usage');
jest.mock('../browsers');

import _ from 'lodash';
import * as Rx from 'rxjs';
import { coreMock } from 'src/core/server/mocks';
import { ReportingConfig, ReportingCore } from '../';
import { featuresPluginMock } from '../../../features/server/mocks';
import {
  chromium,
  HeadlessChromiumDriverFactory,
  initializeBrowserDriverFactory,
} from '../browsers';
import { ReportingConfigType } from '../config';
import { ReportingInternalSetup, ReportingInternalStart } from '../core';
import { ReportingStore } from '../lib';
import { createMockLevelLogger } from './create_mock_levellogger';

(initializeBrowserDriverFactory as jest.Mock<
  Promise<HeadlessChromiumDriverFactory>
>).mockImplementation(() => Promise.resolve({} as HeadlessChromiumDriverFactory));

(chromium as any).createDriverFactory.mockImplementation(() => ({}));

export const createMockPluginSetup = (setupMock?: any): ReportingInternalSetup => {
  return {
    features: featuresPluginMock.createSetup(),
    elasticsearch: setupMock.elasticsearch || { legacy: { client: {} } },
    basePath: { set: jest.fn() },
    router: setupMock.router,
    security: setupMock.security,
    licensing: { license$: Rx.of({ isAvailable: true, isActive: true, type: 'basic' }) } as any,
    taskManager: { registerTaskDefinitions: jest.fn() } as any,
    ...setupMock,
  };
};

const logger = createMockLevelLogger();

const createMockPluginStart = (
  mockReportingCore: ReportingCore,
  startMock?: any
): ReportingInternalStart => {
  const store = new ReportingStore(mockReportingCore, logger);
  return {
    browserDriverFactory: startMock.browserDriverFactory,
    savedObjects: startMock.savedObjects || { getScopedClient: jest.fn() },
    uiSettings: startMock.uiSettings || { asScopedToClient: () => ({ get: jest.fn() }) },
    store,
    taskManager: {
      schedule: jest.fn().mockImplementation(() => ({ id: 'taskId' })),
      ensureScheduled: jest.fn(),
    } as any,
    ...startMock,
  };
};

interface ReportingConfigTestType {
  index: string;
  encryptionKey: string;
  queue: Partial<ReportingConfigType['queue']>;
  kibanaServer: Partial<ReportingConfigType['kibanaServer']>;
  csv: Partial<ReportingConfigType['csv']>;
  capture: any;
  server?: any;
}

export const createMockConfigSchema = (
  overrides: Partial<ReportingConfigTestType> = {}
): ReportingConfigType => {
  // deeply merge the defaults and the provided partial schema
  return {
    index: '.reporting',
    encryptionKey: 'cool-encryption-key-where-did-you-find-it',
    ...overrides,
    kibanaServer: {
      hostname: 'localhost',
      port: 80,
      ...overrides.kibanaServer,
    },
    capture: {
      browser: {
        chromium: {
          disableSandbox: true,
        },
      },
      ...overrides.capture,
    },
    queue: {
      indexInterval: 'week',
      pollEnabled: true,
      pollInterval: 3000,
      timeout: 120000,
      ...overrides.queue,
    },
    csv: {
      ...overrides.csv,
    },
  } as any;
};

export const createMockConfig = (
  reportingConfig: Partial<ReportingConfigTestType>
): ReportingConfig => {
  const mockConfigGet = jest.fn().mockImplementation((...keys: string[]) => {
    return _.get(reportingConfig, keys.join('.'));
  });
  return {
    get: mockConfigGet,
    kbnConfig: { get: mockConfigGet },
  };
};

export const createMockReportingCore = async (
  config: ReportingConfig,
  setupDepsMock: ReportingInternalSetup | undefined = undefined,
  startDepsMock: ReportingInternalStart | undefined = undefined
) => {
  if (!setupDepsMock) {
    setupDepsMock = createMockPluginSetup({});
  }

  config = config || {};
  const context = coreMock.createPluginInitializerContext(createMockConfigSchema());
  const core = new ReportingCore(logger, context);
  core.setConfig(config);
  core.pluginSetup(setupDepsMock);
  await core.pluginSetsUp();

  if (!startDepsMock) {
    startDepsMock = createMockPluginStart(core, context);
  }

  await core.pluginStart(startDepsMock);
  await core.pluginStartsUp();

  return core;
};
