/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../csv_searchsource/generate_csv', () => ({
  CsvGenerator: class CsvGeneratorMock {
    generateData() {
      return {
        size: 123,
        content_type: 'text/csv',
      };
    }
  },
}));

jest.mock('./lib/get_sharing_data', () => ({
  getSharingData: jest.fn(() => ({ columns: [], searchSource: {} })),
}));

import { Writable } from 'stream';
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
let stream: jest.Mocked<Writable>;

beforeAll(async () => {
  const crypto = nodeCrypto({ encryptionKey });
  encryptedHeaders = await crypto.encrypt(headers);
});

beforeEach(async () => {
  stream = {} as typeof stream;
  reportingCore = await createMockReportingCore(createMockConfigSchema({ encryptionKey }));
});

test('recognized saved search', async () => {
  reportingCore.getSavedObjectsClient = jest.fn().mockResolvedValue({
    get: () => ({
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
        },
      },
      references: [
        {
          id: 'logstash-yes-*',
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
        },
      ],
    }),
  });

  const runTask = runTaskFnFactory(reportingCore, logger);
  const payload = await runTask(
    'cool-job-id',
    {
      headers: encryptedHeaders,
      browserTimezone: 'US/Alaska',
      savedObjectId: '123-456-abc-defgh',
      objectType: 'saved search',
      title: 'Test Search',
      version: '7.17.0',
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

test('saved search object is missing references', async () => {
  reportingCore.getSavedObjectsClient = jest.fn().mockResolvedValue({
    get: () => ({
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
        },
      },
    }),
  });

  const runTask = runTaskFnFactory(reportingCore, logger);
  const runTest = async () => {
    await runTask(
      'cool-job-id',
      {
        headers: encryptedHeaders,
        browserTimezone: 'US/Alaska',
        savedObjectId: '123-456-abc-defgh',
        objectType: 'saved search',
        title: 'Test Search',
        version: '7.17.0',
      },
      new CancellationToken(),
      stream
    );
  };

  await expect(runTest).rejects.toEqual(
    new Error('Could not find reference for kibanaSavedObjectMeta.searchSourceJSON.index')
  );
});

test('invalid saved search', async () => {
  reportingCore.getSavedObjectsClient = jest.fn().mockResolvedValue({ get: jest.fn() });
  const runTask = runTaskFnFactory(reportingCore, logger);
  const runTest = async () => {
    await runTask(
      'cool-job-id',
      {
        headers: encryptedHeaders,
        browserTimezone: 'US/Alaska',
        savedObjectId: '123-456-abc-defgh',
        objectType: 'saved search',
        title: 'Test Search',
        version: '7.17.0',
      },
      new CancellationToken(),
      stream
    );
  };

  await expect(runTest).rejects.toEqual(new Error('Saved search object is not valid'));
});
