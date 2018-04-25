/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Rx from 'rxjs';
import { memoize } from 'lodash';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { executeJobFactory } from './index';
import { generatePdfObservableFactory } from '../lib/generate_pdf';

jest.mock('../lib/generate_pdf', () => {
  const generatePdfObserable = jest.fn();
  return {
    generatePdfObservableFactory: jest.fn().mockReturnValue(generatePdfObserable)
  };
});

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
    savedObjectsClientFactory: jest.fn(),
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
});

const encryptHeaders = async (headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};


test(`fails if it can't decrypt headers`, async () => {
  const executeJob = executeJobFactory(mockServer);
  await expect(executeJob({ objects: [], timeRange: {} }, cancellationToken)).rejects.toBeDefined();
});

test(`passes in decrypted headers to generatePdf`, async () => {
  const headers = {
    foo: 'bar',
    baz: 'quix',
  };

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const encryptedHeaders = await encryptHeaders(headers);
  const executeJob = executeJobFactory(mockServer);
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, headers, undefined, undefined);
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
  };

  const encryptedHeaders = await encryptHeaders({
    ...permittedHeaders,
    ...blacklistedHeaders
  });

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, permittedHeaders, undefined, undefined);
});

test(`gets logo from uiSettings`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, {}, undefined, logo);
});

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const browserTimezone = 'UTC';
  await executeJob({ objects: [], browserTimezone, headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(generatePdfObservable).toBeCalledWith(undefined, [], browserTimezone, {}, undefined, undefined);
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({ objects: [{ relativeUrl: 'app/kibana#/something' }], forceNow, headers: encryptedHeaders }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, ['http://localhost:5601/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z'], undefined, {}, undefined, undefined);
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({
    objects: [{ relativeUrl: 'app/kibana#/something?_g=something' }],
    forceNow,
    headers: encryptedHeaders
  }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, ['http://localhost:5601/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'], undefined, {}, undefined, undefined);
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);

  await executeJob({ objects: [{ relativeUrl: 'app/kibana#/something' }], headers: encryptedHeaders }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, ['http://localhost:5601/app/kibana#/something'], undefined, {}, undefined, undefined);
});

test(`returns content_type of application/pdf`, async () => {
  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob({ objects: [], timeRange: {}, headers: encryptedHeaders }, cancellationToken);
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.Observable.of(Buffer.from(testContent)));

  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob({ objects: [], timeRange: {}, headers: encryptedHeaders }, cancellationToken);

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});

