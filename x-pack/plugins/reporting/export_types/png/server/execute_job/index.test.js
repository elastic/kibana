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

jest.mock('../lib/generate_Png', () => ({ generatePngObservableFactory: jest.fn() }));

const cancellationToken = {
  on: jest.fn()
};

let mockServer;
beforeEach(() => {
  mockServer = {
    expose: () => { },
    config: memoize(() => ({ get: jest.fn() })),
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
    return {
      'xpack.reporting.encryptionKey': 'testencryptionkey',
      'xpack.reporting.kibanaServer.protocol': 'http',
      'xpack.reporting.kibanaServer.hostname': 'localhost',
      'xpack.reporting.kibanaServer.port': 5601,
      'server.basePath': ''
    }[key];
  });

  generatePngObservableFactory.mockReturnValue(jest.fn());
});

afterEach(() => generatePngObservableFactory.mockReset());

const encryptHeaders = async (headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};


test(`fails if it can't decrypt headers`, async () => {
  const executeJob = executeJobFactory(mockServer);
  await expect(executeJob({ objects: [], timeRange: {} }, cancellationToken)).rejects.toBeDefined();
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
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith(undefined, [], undefined, headers, undefined, undefined);
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
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith(undefined, [], undefined, permittedHeaders, undefined, undefined);
});

test(`gets logo from uiSettings`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPngLogo');
  expect(generatePngObservable).toBeCalledWith(undefined, [], undefined, {}, undefined, logo);
});

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const browserTimezone = 'UTC';
  await executeJob({ objects: [], browserTimezone, headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPngLogo');
  expect(generatePngObservable).toBeCalledWith(undefined, [], browserTimezone, {}, undefined, undefined);
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({ objects: [{ relativeUrl: 'app/kibana#/something' }], forceNow, headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith(undefined, ['http://localhost:5601/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z'], undefined, {}, undefined, undefined);
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({
    objects: [{ relativeUrl: 'app/kibana#/something?_g=something' }],
    forceNow,
    headers: encryptedHeaders
  }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith(undefined, ['http://localhost:5601/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'], undefined, {}, undefined, undefined);
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);

  await executeJob({ objects: [{ relativeUrl: 'app/kibana#/something' }], headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith(undefined, ['http://localhost:5601/app/kibana#/something'], undefined, {}, undefined, undefined);
});

test(`returns content_type of application/Png`, async () => {
  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob({ objects: [], timeRange: {}, headers: encryptedHeaders }, cancellationToken);
  expect(contentType).toBe('application/Png');
});

test(`returns content of generatePng getBuffer base64 encoded`, async () => {
  const testContent = 'test content';

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from(testContent)));

  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob({ objects: [], timeRange: {}, headers: encryptedHeaders }, cancellationToken);

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
