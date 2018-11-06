/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import { cryptoFactory } from '../../../server/lib/crypto';
import { decryptJobHeaders, addForceNowQuerystring, omitBlacklistedHeaders, getConditionalHeaders, getCustomLogo } from './index';

let config;
let mockServer;
beforeEach(() => {
  config = {
    'xpack.reporting.encryptionKey': 'testencryptionkey',
    'server.basePath': '/sbp',
    'server.host': 'localhost',
    'server.port': 5601
  };
  mockServer = {
    expose: () => { },
    config: memoize(() => ({ get: jest.fn() })),
    info: {
      protocol: 'http',
    },
    plugins: {
      elasticsearch: {
        getCluster: memoize(() => {
          return {
            callWithRequest: jest.fn()
          };
        })
      }
    },
    savedObjects: {
      getScopedSavedObjectsClient: jest.fn(),
    },
    uiSettingsServiceFactory: jest.fn().mockReturnValue({ get: jest.fn() }),
  };

  mockServer.config().get.mockImplementation((key) => {
    return config[key];
  });

});

const encryptHeaders = async (headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe('headers', () => {
  test(`fails if no URL is passed`, async () => {
    await expect(addForceNowQuerystring({ job: { timeRange: {} }, server: mockServer })).rejects.toBeDefined();
  });


  test(`fails if it can't decrypt headers`, async () => {
    await expect(decryptJobHeaders({ job: { relativeUrl: '/app/kibana#/something', timeRange: {} },
      server: mockServer })).rejects.toBeDefined();
  });

  test(`passes back decrypted headers that were passed in`, async () => {
    const headers = {
      foo: 'bar',
      baz: 'quix',
    };

    const encryptedHeaders = await encryptHeaders(headers);
    const { decryptedHeaders } = await decryptJobHeaders({ job: { relativeUrl: '/app/kibana#/something', headers: encryptedHeaders },
      server: mockServer });
    expect(decryptedHeaders).toEqual(headers);
  });
  test(`omits blacklisted headers`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const blacklistedHeaders = {
      'accept-encoding': '',
      'content-length': '',
      'content-type': '',
      'host': '',
      'transfer-encoding': '',
    };

    const { filteredHeaders } = await omitBlacklistedHeaders({ job: { }, decryptedHeaders: {
      ...permittedHeaders,
      ...blacklistedHeaders
    }, server: mockServer });

    expect(filteredHeaders).toEqual(permittedHeaders);

  });


  describe('conditions', () => {
    test(`uses hostname from reporting config if set`, async () => {
      config['xpack.reporting.kibanaServer.hostname'] = 'custom-hostname';
      const permittedHeaders = {
        foo: 'bar',
        baz: 'quix',
      };

      const { conditionalHeaders } = await getConditionalHeaders({ job: { },
        filteredHeaders: permittedHeaders,
        server: mockServer });

      expect(conditionalHeaders.conditions.hostname).toEqual(config['xpack.reporting.kibanaServer.hostname']);

    });

    test(`uses hostname from server.config if reporting config not set`, async () => {
      const permittedHeaders = {
        foo: 'bar',
        baz: 'quix',
      };

      const { conditionalHeaders } = await getConditionalHeaders({ job: { },
        filteredHeaders: permittedHeaders,
        server: mockServer });

      expect(conditionalHeaders.conditions.hostname).toEqual(config['server.host']);

    });

    test(`uses port from reporting config if set`, async () => {
      config['xpack.reporting.kibanaServer.port'] = 443;

      const permittedHeaders = {
        foo: 'bar',
        baz: 'quix',
      };

      const { conditionalHeaders } = await getConditionalHeaders({ job: { },
        filteredHeaders: permittedHeaders,
        server: mockServer });

      expect(conditionalHeaders.conditions.port).toEqual(config['xpack.reporting.kibanaServer.port']);

    });

    test(`uses port from server if reporting config not set`, async () => {
      const permittedHeaders = {
        foo: 'bar',
        baz: 'quix',
      };

      const { conditionalHeaders } = await getConditionalHeaders({ job: { },
        filteredHeaders: permittedHeaders,
        server: mockServer });

      expect(conditionalHeaders.conditions.port).toEqual(config['server.port']);

    });

    test(`uses basePath from server config`, async () => {
      const permittedHeaders = {
        foo: 'bar',
        baz: 'quix',
      };

      const { conditionalHeaders } = await getConditionalHeaders({ job: { },
        filteredHeaders: permittedHeaders,
        server: mockServer });

      expect(conditionalHeaders.conditions.basePath).toEqual(config['server.basePath']);

    });

    test(`uses protocol from reporting config if set`, async () => {
      config['xpack.reporting.kibanaServer.protocol'] = 'https';
      const permittedHeaders = {
        foo: 'bar',
        baz: 'quix',
      };

      const { conditionalHeaders } = await getConditionalHeaders({ job: { },
        filteredHeaders: permittedHeaders,
        server: mockServer });

      expect(conditionalHeaders.conditions.protocol).toEqual(config['xpack.reporting.kibanaServer.protocol']);

    });

    test(`uses protocol from server.info`, async () => {
      const permittedHeaders = {
        foo: 'bar',
        baz: 'quix',
      };

      const { conditionalHeaders } = await getConditionalHeaders({ job: { },
        filteredHeaders: permittedHeaders,
        server: mockServer });

      expect(conditionalHeaders.conditions.protocol).toEqual(mockServer.info.protocol);

    });

    test(`adds forceNow to hash's query, if it exists`, async () => {

      const forceNow = '2000-01-01T00:00:00.000Z';

      const { urls } = await addForceNowQuerystring({ job: { relativeUrl: '/app/kibana#/something', forceNow }, server: mockServer });

      expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z');

    });

    test(`appends forceNow to hash's query, if it exists`, async () => {
      const forceNow = '2000-01-01T00:00:00.000Z';

      const { urls } = await addForceNowQuerystring({ job: { relativeUrl: '/app/kibana#/something?_g=something',
        forceNow }, server: mockServer });

      expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z');
    });

    test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
      const { urls } = await addForceNowQuerystring({ job: { relativeUrl: '/app/kibana#/something'
      }, server: mockServer });

      expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something');

    });
  });
});

test('uses basePath from job when creating saved object service', async () => {

  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({ job: { },
    filteredHeaders: permittedHeaders,
    server: mockServer });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const jobBasePath = '/sbp/s/marketing';
  await getCustomLogo({ job: { objects: [], basePath: jobBasePath },
    conditionalHeaders: conditionalHeaders, server: mockServer });

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe(jobBasePath);
});

test(`uses basePath from server if job doesn't have a basePath when creating saved object service`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({ job: { },
    filteredHeaders: permittedHeaders,
    server: mockServer });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  await getCustomLogo({ job: { objects: [] },
    conditionalHeaders: conditionalHeaders, server: mockServer });

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe('/sbp');
});

test(`gets logo from uiSettings`, async () => {

  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({ job: { },
    filteredHeaders: permittedHeaders,
    server: mockServer });

  const { logo } = await getCustomLogo({ job: { objects: [] },
    conditionalHeaders: conditionalHeaders, server: mockServer });

  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
});

