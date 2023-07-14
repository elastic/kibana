/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CsvSearchSourceExportType, CsvV2ExportType } from '@kbn/reporting-export-types-csv';
import { PdfExportType } from '@kbn/reporting-export-types-pdf';
import { PngExportType } from '@kbn/reporting-export-types-png';
import nodeCrypto from '@elastic/node-crypto';
import { loggingSystemMock } from '@kbn/core-logging-browser-mocks';
import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/server/mocks';
import { createMockScreenshottingStart } from '@kbn/screenshotting-plugin/server/mock';
import { createMockConfigSchema } from '../../test_helpers';

// config setup
const encryptionKey = 'testkey';
const crypto = nodeCrypto({ encryptionKey });
const headers = { sid: 'cooltestheaders' };

// @ts-ignore needed for tests with headers that are encrypted
export const encryptedHeaders = async () => await crypto.encrypt(headers);
const configType = createMockConfigSchema({
  encryptionKey,
  csv: {
    checkForFormulas: true,
    escapeFormulaValues: true,
    maxSizeBytes: 180000,
    scroll: { size: 500, duration: '30s' },
  },
});

const mockCoreSetup = coreMock.createSetup();
const mockCoreStart = coreMock.createStart();
const mockLogger = loggingSystemMock.createLogger();
const context = coreMock.createPluginInitializerContext(configType);

export const mockPdfExportType = new PdfExportType(mockCoreSetup, configType, mockLogger, context);
export const mockPdfSetup = mockPdfExportType.setup({
  basePath: { set: jest.fn() },
});
export const mockPdfStart = mockPdfExportType.start({
  esClient: elasticsearchServiceMock.createClusterClient(),
  savedObjects: mockCoreStart.savedObjects,
  uiSettings: mockCoreStart.uiSettings,
  screenshotting: createMockScreenshottingStart(),
});
export const mockPluginPdfExportType = {
  create: () => mockPdfExportType,
  setup: () => mockPdfSetup,
  start: () => mockPdfStart,
};

export const mockPngExportType = new PngExportType(mockCoreSetup, configType, mockLogger, context);
export const mockPngSetup = mockPngExportType.setup({
  basePath: { set: jest.fn() },
});
export const mockPngStart = mockPngExportType.start({
  esClient: elasticsearchServiceMock.createClusterClient(),
  savedObjects: mockCoreStart.savedObjects,
  uiSettings: mockCoreStart.uiSettings,
  screenshotting: createMockScreenshottingStart(),
});

export const mockCsvV2ExportType = new CsvV2ExportType(
  mockCoreSetup,
  configType,
  mockLogger,
  context
);
export const mockCsvV2Setup = mockCsvV2ExportType.setup({
  basePath: { set: jest.fn() },
});
export const mockCsvV2Start = mockCsvV2ExportType.start({
  esClient: elasticsearchServiceMock.createClusterClient(),
  savedObjects: mockCoreStart.savedObjects,
  uiSettings: mockCoreStart.uiSettings,
  discover: discoverPluginMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  screenshotting: createMockScreenshottingStart(),
});

export const mockCsvSearchSourceExportType = new CsvSearchSourceExportType(
  mockCoreSetup,
  configType,
  mockLogger,
  context
);
export const mockCsvSearchSourceSetup = mockCsvSearchSourceExportType.setup({
  basePath: { set: jest.fn() },
});
export const mockCsvSearchSourceStart = mockCsvSearchSourceExportType.start({
  esClient: elasticsearchServiceMock.createClusterClient(),
  savedObjects: mockCoreStart.savedObjects,
  uiSettings: mockCoreStart.uiSettings,
  discover: discoverPluginMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  screenshotting: createMockScreenshottingStart(),
});

export const mockPluginCsvSearchSourceExportType = {
  create: () => mockCsvSearchSourceExportType,
  setup: () => mockCsvSearchSourceSetup,
  start: () => mockCsvSearchSourceStart,
};
