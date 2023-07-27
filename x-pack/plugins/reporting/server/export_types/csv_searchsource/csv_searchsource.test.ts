/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/generate-csv', () => ({
  CsvGenerator: class CsvGeneratorMock {
    generateData() {
      return {
        size: 123,
        content_type: 'text/csv',
      };
    }
  },
}));

import nodeCrypto from '@elastic/node-crypto';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { Writable } from 'stream';
import { ReportingCore } from '../..';
import { CancellationToken } from '@kbn/reporting-common';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { CsvSearchSourceExportType } from './csv_searchsource';
import { discoverPluginMock } from '@kbn/discover-plugin/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { createMockScreenshottingStart } from '@kbn/screenshotting-plugin/server/mock';

const mockLogger = loggingSystemMock.createLogger();
const encryptionKey = 'tetkey';
const headers = { sid: 'cooltestheaders' };
let encryptedHeaders: string;
let mockReportingCore: ReportingCore;
let stream: jest.Mocked<Writable>;
let mockCsvSearchSourceExportType: CsvSearchSourceExportType;

beforeAll(async () => {
  const crypto = nodeCrypto({ encryptionKey });

  encryptedHeaders = await crypto.encrypt(headers);
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
  const context = coreMock.createPluginInitializerContext(configType);

  mockReportingCore = await createMockReportingCore(configType);

  mockCsvSearchSourceExportType = new CsvSearchSourceExportType(
    mockCoreSetup,
    configType,
    mockLogger,
    context
  );

  mockCsvSearchSourceExportType.setup({
    basePath: { set: jest.fn() },
  });

  mockCsvSearchSourceExportType.start({
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    discover: discoverPluginMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
    screenshotting: createMockScreenshottingStart(),
    reporting: mockReportingCore.getContract(),
  });
});

beforeEach(() => {
  stream = {} as typeof stream;
});

test('gets the csv content from job parameters', async () => {
  const payload = await mockCsvSearchSourceExportType.runTask(
    'cool-job-id',
    {
      headers: encryptedHeaders,
      browserTimezone: 'US/Alaska',
      searchSource: {},
      objectType: 'search',
      title: 'Test Search',
      version: '7.13.0',
    },
    new CancellationToken(),
    stream
  );

  expect(payload).toMatchInlineSnapshot(`
      Object {
        "content_type": "text/csv",
        "size": 123,
      }
    `);
});
