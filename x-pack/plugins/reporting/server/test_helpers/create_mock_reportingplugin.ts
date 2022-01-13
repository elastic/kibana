/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../routes');
jest.mock('../usage');

import _ from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { coreMock, elasticsearchServiceMock, statusServiceMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { dataPluginMock } from 'src/plugins/data/server/mocks';
import { FieldFormatsRegistry } from 'src/plugins/field_formats/common';
import { DeepPartial } from 'utility-types';
import { ReportingConfig, ReportingCore } from '../';
import { featuresPluginMock } from '../../../features/server/mocks';
import { licensingMock } from '../../../licensing/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createMockScreenshottingStart } from '../../../screenshotting/server/mock';
import { securityMock } from '../../../security/server/mocks';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { buildConfig, ReportingConfigType } from '../config';
import { ReportingInternalSetup, ReportingInternalStart } from '../core';
import { ReportingStore } from '../lib';
import { setFieldFormats } from '../services';
import { createMockLevelLogger } from './create_mock_levellogger';

export const createMockPluginSetup = (
  setupMock: Partial<Record<keyof ReportingInternalSetup, any>>
): ReportingInternalSetup => {
  return {
    features: featuresPluginMock.createSetup(),
    basePath: { set: jest.fn() },
    router: setupMock.router,
    security: securityMock.createSetup(),
    taskManager: taskManagerMock.createSetup(),
    logger: createMockLevelLogger(),
    status: statusServiceMock.createSetupContract(),
    eventLog: setupMock.eventLog || {
      registerProviderActions: jest.fn(),
      getLogger: jest.fn(() => ({ logEvent: jest.fn() })),
    },
    ...setupMock,
  };
};

const logger = createMockLevelLogger();

const createMockReportingStore = async (config: ReportingConfigType) => {
  const mockConfigSchema = createMockConfigSchema(config);
  const mockContext = coreMock.createPluginInitializerContext(mockConfigSchema);
  const mockCore = new ReportingCore(logger, mockContext);
  mockCore.setConfig(await buildConfig(mockContext, coreMock.createSetup(), logger));
  return new ReportingStore(mockCore, logger);
};

export const createMockPluginStart = async (
  startMock: Partial<Record<keyof ReportingInternalStart, any>>,
  config: ReportingConfigType
): Promise<ReportingInternalStart> => {
  return {
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: startMock.savedObjects || { getScopedClient: jest.fn() },
    uiSettings: startMock.uiSettings || { asScopedToClient: () => ({ get: jest.fn() }) },
    data: startMock.data || dataPluginMock.createStartContract(),
    store: await createMockReportingStore(config),
    taskManager: {
      schedule: jest.fn().mockImplementation(() => ({ id: 'taskId' })),
      ensureScheduled: jest.fn(),
    },
    licensing: {
      ...licensingMock.createStart(),
      license$: new BehaviorSubject({ isAvailable: true, isActive: true, type: 'basic' }),
    },
    logger,
    screenshotting: startMock.screenshotting || createMockScreenshottingStart(),
    ...startMock,
  };
};

interface ReportingConfigTestType {
  index: string;
  encryptionKey: string;
  queue: Partial<ReportingConfigType['queue']>;
  kibanaServer: Partial<ReportingConfigType['kibanaServer']>;
  csv: Partial<ReportingConfigType['csv']>;
  roles?: Partial<ReportingConfigType['roles']>;
}

export const createMockConfigSchema = (
  overrides: DeepPartial<ReportingConfigType> = {}
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
    roles: {
      enabled: false,
      ...overrides.roles,
    },
  } as ReportingConfigType;
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
  config: ReportingConfigType,
  setupDepsMock: ReportingInternalSetup | undefined = undefined,
  startDepsMock: ReportingInternalStart | undefined = undefined
) => {
  if (!setupDepsMock) {
    setupDepsMock = createMockPluginSetup({});
  }

  const context = coreMock.createPluginInitializerContext(createMockConfigSchema());
  context.config = { get: () => config } as any;

  const core = new ReportingCore(logger, context);
  core.setConfig(createMockConfig(config));

  core.pluginSetup(setupDepsMock);
  await core.pluginSetsUp();

  if (!startDepsMock) {
    startDepsMock = await createMockPluginStart(context, config);
  }
  await core.pluginStart(startDepsMock);
  await core.pluginStartsUp();

  setFieldFormats({
    fieldFormatServiceFactory() {
      const fieldFormatsRegistry = new FieldFormatsRegistry();
      return Promise.resolve(fieldFormatsRegistry);
    },
  });

  return core;
};
