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
        content: 'test\n123',
      };
    }
  },
}));

import nodeCrypto from '@elastic/node-crypto';
import { ReportingCore } from '../../';
import { CancellationToken } from '../../../common';
import {
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { runTaskFnFactory } from './execute_job';

const logger = createMockLevelLogger();
const encryptionKey = 'tetkey';
const headers = { sid: 'cooltestheaders' };
let encryptedHeaders: string;
let reportingCore: ReportingCore;

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
    },
    new CancellationToken()
  );

  expect(payload).toMatchInlineSnapshot(`
    Object {
      "content": "test
    123",
    }
  `);
});
