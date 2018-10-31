/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { memoize } from 'lodash';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { executeJobFactory } from './index';
import { generatePngObservableFactory } from '../lib/generate_png';

jest.mock('../lib/generate_png', () => ({ generatePngObservableFactory: jest.fn() }));

const cancellationToken = {
  on: jest.fn()
};

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

  generatePngObservableFactory.mockReturnValue(jest.fn());
});

afterEach(() => generatePngObservableFactory.mockReset());

const encryptHeaders = async (headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe('headers', () => {
  test(`fails if no URL is passed`, async () => {
    const executeJob = executeJobFactory(mockServer);
    await expect(executeJob({ timeRange: {} }, cancellationToken)).rejects.toBeDefined();
  });

  test(`fails if it can't decrypt headers`, async () => {
    const executeJob = executeJobFactory(mockServer);
    await expect(executeJob({ relativeUrl: '/app/kibana#/something', timeRange: {} }, cancellationToken)).rejects.toBeDefined();
  });

  test(`passes in decrypted headers to generatePng`, async () => {
    const headers = {
      foo: 'bar',
      baz: 'quix',
    };

    const generatePngObservable = generatePngObservableFactory();
    generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const encryptedHeaders = await encryptHeaders(headers);
    const executeJob = executeJobFactory(mockServer);
    await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

    expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
      headers: headers
    }), undefined);
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

    const encryptedHeaders = await encryptHeaders({
      ...permittedHeaders,
      ...blacklistedHeaders
    });

    const generatePngObservable = generatePngObservableFactory();
    generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const executeJob = executeJobFactory(mockServer);
    await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

    expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
      headers: permittedHeaders
    }), undefined);
  });

  describe('conditions', () => {
    test(`uses hostname from reporting config if set`, async () => {
      config['xpack.reporting.kibanaServer.hostname'] = 'custom-hostname';

      const encryptedHeaders = await encryptHeaders({});

      const generatePngObservable = generatePngObservableFactory();
      generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

      const executeJob = executeJobFactory(mockServer);
      await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

      //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
      expect(generatePngObservable).toBeCalledWith('http://custom-hostname:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
        headers: expect.anything(),
        conditions: expect.objectContaining({
          hostname: config['xpack.reporting.kibanaServer.hostname']
        })
      }), undefined);
    });

    test(`uses hostname from server.config if reporting config not set`, async () => {
      const encryptedHeaders = await encryptHeaders({});

      const generatePngObservable = generatePngObservableFactory();
      generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

      const executeJob = executeJobFactory(mockServer);
      await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

      //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
      expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
        headers: expect.anything(),
        conditions: expect.objectContaining({
          hostname: config['server.host']
        })
      }), undefined);
    });

    test(`uses port from reporting config if set`, async () => {
      config['xpack.reporting.kibanaServer.port'] = 443;

      const encryptedHeaders = await encryptHeaders({});

      const generatePngObservable = generatePngObservableFactory();
      generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

      const executeJob = executeJobFactory(mockServer);
      await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

      //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
      expect(generatePngObservable).toBeCalledWith('http://localhost:443/sbp/app/kibana#/something', undefined, expect.objectContaining({
        headers: expect.anything(),
        conditions: expect.objectContaining({
          port: config['xpack.reporting.kibanaServer.port']
        })
      }), undefined);
    });

    test(`uses port from server if reporting config not set`, async () => {
      const encryptedHeaders = await encryptHeaders({});

      const generatePngObservable = generatePngObservableFactory();
      generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

      const executeJob = executeJobFactory(mockServer);
      await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

      //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
      expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
        headers: expect.anything(),
        conditions: expect.objectContaining({
          port: config['server.port']
        })
      }), undefined);
    });

    test(`uses basePath from server config`, async () => {
      const encryptedHeaders = await encryptHeaders({});

      const generatePngObservable = generatePngObservableFactory();
      generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

      const executeJob = executeJobFactory(mockServer);
      await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

      //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
      expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
        headers: expect.anything(),
        conditions: expect.objectContaining({
          basePath: config['server.basePath']
        })
      }), undefined);
    });

    test(`uses protocol from reporting config if set`, async () => {
      config['xpack.reporting.kibanaServer.protocol'] = 'https';

      const encryptedHeaders = await encryptHeaders({});

      const generatePngObservable = generatePngObservableFactory();
      generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

      const executeJob = executeJobFactory(mockServer);
      await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

      //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
      expect(generatePngObservable).toBeCalledWith('https://localhost:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
        headers: expect.anything(),
        conditions: expect.objectContaining({
          protocol: config['xpack.reporting.kibanaServer.protocol']
        })
      }), undefined);
    });

    test(`uses protocol from server.info`, async () => {
      const encryptedHeaders = await encryptHeaders({});

      const generatePngObservable = generatePngObservableFactory();
      generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

      const executeJob = executeJobFactory(mockServer);
      await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

      //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
      expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, expect.objectContaining({
        headers: expect.anything(),
        conditions: expect.objectContaining({
          protocol: mockServer.info.protocol
        })
      }), undefined);
    });
  });
});

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const browserTimezone = 'UTC';
  await executeJob({ relativeUrl: '/app/kibana#/something', browserTimezone, headers: encryptedHeaders }, cancellationToken);

  //expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:custompngLogo');
  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', browserTimezone, expect.anything(), undefined);
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({ relativeUrl: '/app/kibana#/something', forceNow, headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z', undefined, expect.anything(), undefined);
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({
    relativeUrl: '/app/kibana#/something?_g=something',
    forceNow,
    headers: encryptedHeaders
  }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z', undefined, expect.anything(), undefined);
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);

  await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, expect.anything(), undefined);
});

test(`returns content_type of application/png`, async () => {
  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob({ relativeUrl: '/app/kibana#/something',
    timeRange: {}, headers: encryptedHeaders }, cancellationToken);
  expect(contentType).toBe('image/png');
});

test(`returns content of generatePng getBuffer base64 encoded`, async () => {
  const testContent = 'test content';

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from(testContent)));

  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob({ relativeUrl: '/app/kibana#/something',
    timeRange: {}, headers: encryptedHeaders }, cancellationToken);

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
