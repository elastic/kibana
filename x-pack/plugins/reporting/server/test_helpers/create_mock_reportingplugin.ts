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

import { of } from 'rxjs';
import { first } from 'rxjs/operators';
import { coreMock } from 'src/core/server/mocks';
import { ReportingConfig, ReportingCore } from '../';
import {
  chromium,
  HeadlessChromiumDriverFactory,
  initializeBrowserDriverFactory,
} from '../browsers';
import { ReportingInternalSetup } from '../core';
import { ReportingPlugin } from '../plugin';
import { ReportingSetupDeps, ReportingStartDeps } from '../types';

(initializeBrowserDriverFactory as jest.Mock<
  Promise<HeadlessChromiumDriverFactory>
>).mockImplementation(() => Promise.resolve({} as HeadlessChromiumDriverFactory));

(chromium as any).createDriverFactory.mockImplementation(() => ({}));

const createMockSetupDeps = (setupMock?: any): ReportingSetupDeps => {
  return {
    security: setupMock.security,
    licensing: {
      license$: of({ isAvailable: true, isActive: true, type: 'basic' }),
    } as any,
    usageCollection: {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as any,
  };
};

export const createMockConfigSchema = (overrides?: any) => ({
  index: '.reporting',
  kibanaServer: {
    hostname: 'localhost',
    port: '80',
  },
  capture: {
    browser: {
      chromium: {
        disableSandbox: true,
      },
    },
  },
  ...overrides,
});

export const createMockStartDeps = (startMock?: any): ReportingStartDeps => ({
  data: startMock.data,
});

const createMockReportingPlugin = async (config: ReportingConfig): Promise<ReportingPlugin> => {
  const mockConfigSchema = createMockConfigSchema(config);
  const plugin = new ReportingPlugin(coreMock.createPluginInitializerContext(mockConfigSchema));
  const setupMock = coreMock.createSetup();
  const coreStartMock = coreMock.createStart();
  const startMock = {
    ...coreStartMock,
    data: { fieldFormats: {} },
  };

  plugin.setup(setupMock, createMockSetupDeps(setupMock));
  await plugin.setup$.pipe(first()).toPromise();
  plugin.start(startMock, createMockStartDeps(startMock));
  await plugin.start$.pipe(first()).toPromise();

  return plugin;
};

export const createMockReportingCore = async (
  config: ReportingConfig,
  setupDepsMock?: ReportingInternalSetup
): Promise<ReportingCore> => {
  config = config || {};
  const plugin = await createMockReportingPlugin(config);
  const core = plugin.getReportingCore();

  if (setupDepsMock) {
    // @ts-ignore overwriting private properties
    core.pluginSetupDeps = setupDepsMock;
  }

  return core;
};
