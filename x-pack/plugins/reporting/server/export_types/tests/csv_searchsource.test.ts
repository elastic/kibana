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

import { Writable } from 'stream';
import { CancellationToken } from '@kbn/reporting-common';
import { CsvSearchSourceExportType } from '@kbn/reporting-export-types-csv';
import { encryptedHeaders, mockPluginCsvSearchSourceExportType } from '../mocks/mocks';

let stream: jest.Mocked<Writable>;
let mockCsvSearchSourceExportType: CsvSearchSourceExportType;

beforeAll(async () => {
  // const crypto = nodeCrypto({ encryptionKey });

  // encryptedHeaders = await crypto.encrypt(headers);

  mockCsvSearchSourceExportType = mockPluginCsvSearchSourceExportType.create();
  mockPluginCsvSearchSourceExportType.setup();
  mockPluginCsvSearchSourceExportType.start();
});

beforeEach(() => {
  stream = {} as typeof stream;
});

test('gets the csv content from job parameters', async () => {
  const payload = await mockCsvSearchSourceExportType.runTask(
    'cool-job-id',
    {
      headers: await encryptedHeaders(),
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
