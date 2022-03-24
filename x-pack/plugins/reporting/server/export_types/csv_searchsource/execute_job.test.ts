/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./generate_csv/generate_csv', () => ({
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
import { loggingSystemMock } from 'src/core/server/mocks';
import { Writable } from 'stream';
import { ReportingCore } from '../../';
import { CancellationToken } from '../../../common/cancellation_token';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { runTaskFnFactory } from './execute_job';

const logger = loggingSystemMock.createLogger();
const encryptionKey = 'tetkey';
const headers = { sid: 'cooltestheaders' };
let encryptedHeaders: string;
let reportingCore: ReportingCore;
let stream: jest.Mocked<Writable>;

beforeAll(async () => {
  const crypto = nodeCrypto({ encryptionKey });

  encryptedHeaders = await crypto.encrypt(headers);
  reportingCore = await createMockReportingCore(
    createMockConfigSchema({
      encryptionKey,
      csv: {
        checkForFormulas: true,
        escapeFormulaValues: true,
        maxSizeBytes: 180000,
        scroll: { size: 500, duration: '30s' },
      },
    })
  );
});

beforeEach(() => {
  stream = {} as typeof stream;
});

test('gets the csv content from job parameters', async () => {
  const runTask = runTaskFnFactory(reportingCore, logger);

  const payload = await runTask(
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
