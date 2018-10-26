/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compatibilityShimFactory } from './compatibility_shim';
import { cryptoFactory } from '../../../../server/lib/crypto';

const createMockServer = ({ security = null } = {}) => {
  const config = {
    'server.host': 'localhost',
    'server.port': '5601',
    'server.basePath': '',
    'xpack.reporting.encryptionKey': '1234567890qwerty'
  };

  return {
    info: {
      protocol: 'http'
    },
    expose: jest.fn(), // fools once_per_server
    log: jest.fn(),
    config: () => {
      return {
        get: key => config[key]
      };
    },
    plugins: {
      security
    }
  };
};

const encrypt = async (mockServer, headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe('urls', () => {
  test(`it throw error if full URL is provided that is not a Kibana URL`, async () => {
    const mockCreateJob = jest.fn();
    const compatibilityShim = compatibilityShimFactory(createMockServer());

    await expect(compatibilityShim(mockCreateJob)({ query: '', objects: [ { url: 'https://localhost/app/kibana' } ] })).rejects.toThrowErrorMatchingSnapshot();
  });

  test(`it passes url through if it is a Kibana URL`, async () => {
    const mockExecuteJob = jest.fn();
    const headers = {};
    const mockServer = createMockServer();
    const encryptedHeaders = await encrypt(mockServer, headers);
    const compatibilityShim = compatibilityShimFactory(mockServer);

    const url = 'http://localhost:5601/app/kibana/#visualize';
    await compatibilityShim(mockExecuteJob)({ objects: [ { url } ], headers: encryptedHeaders });
    expect(mockExecuteJob.mock.calls.length).toBe(1);
    expect(mockExecuteJob.mock.calls[0][0].urls[0]).toBe(url);
  });

  test(`it generates the absolute url if a urlHash is provided`, async () => {
    const mockExecuteJob = jest.fn();
    const headers = {};
    const mockServer = createMockServer();
    const encryptedHeaders = await encrypt(mockServer, headers);
    const compatibilityShim = compatibilityShimFactory(mockServer);

    const urlHash = '#visualize';
    await compatibilityShim(mockExecuteJob)({ objects: [ { urlHash } ], headers: encryptedHeaders });
    expect(mockExecuteJob.mock.calls.length).toBe(1);
    expect(mockExecuteJob.mock.calls[0][0].urls[0]).toBe('http://localhost:5601/app/kibana#visualize');
  });

  test(`it generates the absolute url using server's basePath if a relativeUrl is provided`, async () => {
    const mockExecuteJob = jest.fn();
    const headers = {};
    const mockServer = createMockServer();
    const encryptedHeaders = await encrypt(mockServer, headers);
    const compatibilityShim = compatibilityShimFactory(mockServer);

    const relativeUrl = '/app/kibana#/visualize?';
    await compatibilityShim(mockExecuteJob)({ objects: [ { relativeUrl } ], headers: encryptedHeaders });
    expect(mockExecuteJob.mock.calls.length).toBe(1);
    expect(mockExecuteJob.mock.calls[0][0].urls[0]).toBe('http://localhost:5601/app/kibana#/visualize?');
  });

  test(`it generates the absolute url using job's basePath if a relativeUrl is provided`, async () => {
    const mockExecuteJob = jest.fn();
    const headers = {};
    const mockServer = createMockServer();
    const encryptedHeaders = await encrypt(mockServer, headers);
    const compatibilityShim = compatibilityShimFactory(mockServer);

    const relativeUrl = '/app/kibana#/visualize?';
    await compatibilityShim(mockExecuteJob)({ basePath: '/s/marketing', objects: [ { relativeUrl } ], headers: encryptedHeaders });
    expect(mockExecuteJob.mock.calls.length).toBe(1);
    expect(mockExecuteJob.mock.calls[0][0].urls[0]).toBe('http://localhost:5601/s/marketing/app/kibana#/visualize?');
  });

  test(`it generates the absolute url using server's basePath if a relativeUrl with querystring is provided`, async () => {
    const mockExecuteJob = jest.fn();
    const headers = {};
    const mockServer = createMockServer();
    const encryptedHeaders = await encrypt(mockServer, headers);
    const compatibilityShim = compatibilityShimFactory(mockServer);

    const relativeUrl = '/app/kibana?_t=123456789#/visualize?_g=()';
    await compatibilityShim(mockExecuteJob)({ objects: [ { relativeUrl } ], headers: encryptedHeaders });
    expect(mockExecuteJob.mock.calls.length).toBe(1);
    expect(mockExecuteJob.mock.calls[0][0].urls[0]).toBe('http://localhost:5601/app/kibana?_t=123456789#/visualize?_g=()');
  });

  test(`it generates the absolute url using job's basePath if a relativeUrl with querystring is provided`, async () => {
    const mockExecuteJob = jest.fn();
    const headers = {};
    const mockServer = createMockServer();
    const encryptedHeaders = await encrypt(mockServer, headers);
    const compatibilityShim = compatibilityShimFactory(mockServer);

    const relativeUrl = '/app/kibana?_t=123456789#/visualize?_g=()';
    await compatibilityShim(mockExecuteJob)({ basePath: '/s/marketing', objects: [ { relativeUrl } ], headers: encryptedHeaders });
    expect(mockExecuteJob.mock.calls.length).toBe(1);
    expect(mockExecuteJob.mock.calls[0][0].urls[0]).toBe('http://localhost:5601/s/marketing/app/kibana?_t=123456789#/visualize?_g=()');
  });
});

test(`it passes the provided browserTimezone through`, async () => {
  const mockExecuteJob = jest.fn();
  const headers = {};
  const mockServer = createMockServer();
  const encryptedHeaders = await encrypt(mockServer, headers);
  const compatibilityShim = compatibilityShimFactory(mockServer);

  const browserTimezone = 'UTC';
  await compatibilityShim(mockExecuteJob)({ browserTimezone, objects: [], headers: encryptedHeaders });
  expect(mockExecuteJob.mock.calls.length).toBe(1);
  expect(mockExecuteJob.mock.calls[0][0].browserTimezone).toEqual(browserTimezone);
});

test(`it passes the provided title through`, async () => {
  const mockExecuteJob = jest.fn();
  const headers = {};
  const mockServer = createMockServer();
  const encryptedHeaders = await encrypt(mockServer, headers);
  const compatibilityShim = compatibilityShimFactory(mockServer);

  const title = 'thetitle';
  await compatibilityShim(mockExecuteJob)({ title, objects: [], headers: encryptedHeaders });
  expect(mockExecuteJob.mock.calls.length).toBe(1);
  expect(mockExecuteJob.mock.calls[0][0].title).toEqual(title);
});

test(`it passes the provided layout through`, async () => {
  const mockExecuteJob = jest.fn();
  const headers = {};
  const mockServer = createMockServer();
  const encryptedHeaders = await encrypt(mockServer, headers);
  const compatibilityShim = compatibilityShimFactory(mockServer);

  const layout = Symbol();
  await compatibilityShim(mockExecuteJob)({ layout, objects: [], headers: encryptedHeaders });
  expect(mockExecuteJob.mock.calls.length).toBe(1);
  expect(mockExecuteJob.mock.calls[0][0].layout).toEqual(layout);
});

test(`it passes the provided basePath through`, async () => {
  const mockExecuteJob = jest.fn();
  const headers = {};
  const mockServer = createMockServer();
  const encryptedHeaders = await encrypt(mockServer, headers);
  const compatibilityShim = compatibilityShimFactory(mockServer);

  const basePath = '/foo/bar/baz';
  await compatibilityShim(mockExecuteJob)({ basePath, objects: [], headers: encryptedHeaders });
  expect(mockExecuteJob.mock.calls.length).toBe(1);
  expect(mockExecuteJob.mock.calls[0][0].basePath).toEqual(basePath);
});

test(`it passes the provided forceNow through`, async () => {
  const mockExecuteJob = jest.fn();
  const headers = {};
  const mockServer = createMockServer();
  const encryptedHeaders = await encrypt(mockServer, headers);
  const compatibilityShim = compatibilityShimFactory(mockServer);

  const forceNow = 'ISO 8601 Formatted Date';
  await compatibilityShim(mockExecuteJob)({ forceNow, objects: [], headers: encryptedHeaders });
  expect(mockExecuteJob.mock.calls.length).toBe(1);
  expect(mockExecuteJob.mock.calls[0][0].forceNow).toEqual(forceNow);
});

