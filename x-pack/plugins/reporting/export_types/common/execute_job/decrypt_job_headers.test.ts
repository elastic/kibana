/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { cryptoFactory } from '../../../server/lib/crypto';
import { createMockServer } from '../../../test_helpers/create_mock_server';
import { decryptJobHeaders } from './index';

let mockServer: any;
beforeEach(() => {
  mockServer = createMockServer('');
});

const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe('headers', () => {
  test(`fails if it can't decrypt headers`, async () => {
    await expect(
      decryptJobHeaders({
        job: {
          title: 'cool-job-bro',
          type: 'csv',
          jobParams: {
            savedObjectId: 'abc-123',
            isImmediate: false,
            savedObjectType: 'search',
          },
          relativeUrl: '/app/kibana#/something',
          timeRange: {},
        },
        server: mockServer,
      })
    ).rejects.toBeDefined();
  });

  test(`passes back decrypted headers that were passed in`, async () => {
    const headers = {
      foo: 'bar',
      baz: 'quix',
    };

    const encryptedHeaders = await encryptHeaders(headers);
    const { decryptedHeaders } = await decryptJobHeaders({
      job: {
        title: 'cool-job-bro',
        type: 'csv',
        jobParams: {
          savedObjectId: 'abc-123',
          isImmediate: false,
          savedObjectType: 'search',
        },
        relativeUrl: '/app/kibana#/something',
        headers: encryptedHeaders,
      },
      server: mockServer,
    });
    expect(decryptedHeaders).toEqual(headers);
  });
});
