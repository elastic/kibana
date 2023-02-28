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
import {
  coreMock,
  docLinksServiceMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  statusServiceMock,
} from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/server/mocks';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { DeepPartial } from 'utility-types';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { createMockScreenshottingStart } from '@kbn/screenshotting-plugin/server/mock';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ReportingConfig, ReportingCore } from '..';
import { buildConfig, ReportingConfigType } from '../config';
import { ReportingInternalSetup, ReportingInternalStart } from '../core';
import { ReportingStore } from '../lib';
import { setFieldFormats } from '../services';

export const createMockPluginSetup = (
  setupMock: Partial<Record<keyof ReportingInternalSetup, any>>
): ReportingInternalSetup => {
  return {
    features: featuresPluginMock.createSetup(),
    basePath: { set: jest.fn() },
    router: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    security: securityMock.createSetup(),
    taskManager: taskManagerMock.createSetup(),
    logger: loggingSystemMock.createLogger(),
    status: statusServiceMock.createSetupContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
    ...setupMock,
  };
};

const logger = loggingSystemMock.createLogger();

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
    savedObjects: { getScopedClient: jest.fn() },
    uiSettings: { asScopedToClient: () => ({ get: jest.fn() }) },
    discover: discoverPluginMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
    fieldFormats: () => Promise.resolve(fieldFormatsMock),
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
    screenshotting: createMockScreenshottingStart(),
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
      scroll: { size: 500, duration: '30s' },
      ...overrides.csv,
    },
    roles: {
      enabled: false,
      ...overrides.roles,
    },
    capture: { maxAttempts: 1 },
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
