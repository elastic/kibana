/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
// @ts-ignore
import { cryptoFactory } from '../../../server/lib/crypto';
import { decryptJobHeaders } from './index';

let config: any;
let mockServer: any;
beforeEach(() => {
  config = {
    'xpack.reporting.encryptionKey': 'testencryptionkey',
    'server.basePath': '/sbp',
    'server.host': 'localhost',
    'server.port': 5601,
  };
  mockServer = {
    expose: () => {
      ' ';
    },
    config: memoize(() => ({ get: jest.fn() })),
    info: {
      protocol: 'http',
    },
    plugins: {
      elasticsearch: {
        getCluster: memoize(() => {
          return {
            callWithRequest: jest.fn(),
          };
        }),
      },
    },
    savedObjects: {
      getScopedSavedObjectsClient: jest.fn(),
    },
    uiSettingsServiceFactory: jest.fn().mockReturnValue({ get: jest.fn() }),
  };

  mockServer.config().get.mockImplementation((key: any) => {
    return config[key];
  });
});

const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe('headers', () => {
  test(`fails if it can't decrypt headers`, async () => {
    await expect(
      decryptJobHeaders({
        job: { relativeUrl: '/app/kibana#/something', timeRange: {} },
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
      job: { relativeUrl: '/app/kibana#/something', headers: encryptedHeaders },
      server: mockServer,
    });
    expect(decryptedHeaders).toEqual(headers);
  });
});
