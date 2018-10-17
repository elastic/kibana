/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { memoize } from 'lodash';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { executeJobFactory } from './index';
import { generatePdfObservableFactory } from '../lib/generate_pdf';

jest.mock('../lib/generate_pdf', () => ({ generatePdfObservableFactory: jest.fn() }));

const cancellationToken = {
  on: jest.fn()
};

let mockServer;
let config;
beforeEach(() => {
  config = {
    'xpack.security.cookieName': 'sid',
    'xpack.reporting.encryptionKey': 'testencryptionkey',
    'xpack.reporting.kibanaServer.protocol': 'http',
    'xpack.reporting.kibanaServer.hostname': 'localhost',
    'xpack.reporting.kibanaServer.port': 5601,
    'server.basePath': '/sbp'
  };

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
      },
      security: null,
    },
    savedObjects: {
      getScopedSavedObjectsClient: jest.fn(),
    },
    uiSettingsServiceFactory: jest.fn().mockReturnValue({ get: jest.fn() }),
  };

  mockServer.config().get.mockImplementation((key) => {
    return config[key];
  });

  generatePdfObservableFactory.mockReturnValue(jest.fn());
});

afterEach(() => generatePdfObservableFactory.mockReset());

const encrypt = async (headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe(`sessionCookie`, () => {
  test(`if serializedSession doesn't exist it doesn't pass sessionCookie to generatePdfObservable`, async () => {
    mockServer.plugins.security = {};
    const headers = {};
    const encryptedHeaders = await encrypt(headers);

    const generatePdfObservable = generatePdfObservableFactory();
    generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const executeJob = executeJobFactory(mockServer);
    await executeJob({ objects: [], headers: encryptedHeaders, session: null }, cancellationToken);

    expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, null, undefined, undefined);
  });

  test(`if uses xpack.reporting.kibanaServer.hostname for domain of sessionCookie passed to generatePdfObservable`, async () => {
    const sessionCookieOptions = {
      httpOnly: true,
      name: 'foo',
      path: '/bar',
      secure: false,
    };
    mockServer.plugins.security = {
      getSessionCookieOptions() {
        return sessionCookieOptions;
      },
    };
    const headers = {};
    const encryptedHeaders = await encrypt(headers);

    const session = 'thisoldesession';
    const encryptedSession = await encrypt(session);

    const generatePdfObservable = generatePdfObservableFactory();
    generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const executeJob = executeJobFactory(mockServer);
    await executeJob({ objects: [], headers: encryptedHeaders, session: encryptedSession }, cancellationToken);

    expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, {
      domain: config['xpack.reporting.kibanaServer.hostname'],
      httpOnly: sessionCookieOptions.httpOnly,
      name: sessionCookieOptions.name,
      path: sessionCookieOptions.path,
      sameSite: 'Strict',
      secure: sessionCookieOptions.secure,
      value: session
    }, undefined, undefined);
  });

  test(`if uses server.host and reporting config isn't set for domain of sessionCookie passed to generatePdfObservable`, async () => {
    config['xpack.reporting.kibanaServer.hostname'] = undefined;
    config['server.host'] = 'something.com';
    const sessionCookieOptions = {
      httpOnly: true,
      name: 'foo',
      path: '/bar',
      secure: false,
    };
    mockServer.plugins.security = {
      getSessionCookieOptions() {
        return sessionCookieOptions;
      },
    };
    const headers = {};
    const encryptedHeaders = await encrypt(headers);

    const session = 'thisoldesession';
    const encryptedSession = await encrypt(session);

    const generatePdfObservable = generatePdfObservableFactory();
    generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const executeJob = executeJobFactory(mockServer);
    await executeJob({ objects: [], headers: encryptedHeaders, session: encryptedSession }, cancellationToken);

    expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, {
      domain: config['server.host'],
      httpOnly: sessionCookieOptions.httpOnly,
      name: sessionCookieOptions.name,
      path: sessionCookieOptions.path,
      sameSite: 'Strict',
      secure: sessionCookieOptions.secure,
      value: session
    }, undefined, undefined);
  });
});

test('uses basePath from job when creating saved object service', async () => {
  const encryptedHeaders = await encrypt({});

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const jobBasePath = '/sbp/s/marketing';
  await executeJob({ objects: [], headers: encryptedHeaders, basePath: jobBasePath }, cancellationToken);

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe(jobBasePath);
});

test(`uses basePath from server if job doesn't have a basePath when creating saved object service`, async () => {
  const encryptedHeaders = await encrypt({});

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe('/sbp');
});

test(`gets logo from uiSettings`, async () => {
  const authorizationHeader = 'thisoldeheader';
  const encryptedHeaders = await encrypt({
    authorization: authorizationHeader,
    thisotherheader: 'pleasedontshowup'
  });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.savedObjects.getScopedSavedObjectsClient).toBeCalledWith({
    headers: {
      authorization: authorizationHeader
    },
    getBasePath: expect.anything()
  });
  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, null, undefined, logo);
});

test(`doesn't pass authorization header if it doesn't exist when getting logo from uiSettings`, async () => {
  const encryptedHeaders = await encrypt({
    thisotherheader: 'pleasedontshowup'
  });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  await executeJob({ objects: [], headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.savedObjects.getScopedSavedObjectsClient).toBeCalledWith({
    headers: {},
    getBasePath: expect.anything()
  });
  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(generatePdfObservable).toBeCalledWith(undefined, [], undefined, null, undefined, logo);
});

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const browserTimezone = 'UTC';
  await executeJob({ objects: [], browserTimezone, headers: encryptedHeaders }, cancellationToken);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(generatePdfObservable).toBeCalledWith(undefined, [], browserTimezone, null, undefined, undefined);
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({ objects: [{ relativeUrl: '/app/kibana#/something' }], forceNow, headers: encryptedHeaders }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, ['http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z'], undefined, null, undefined, undefined);
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({
    objects: [{ relativeUrl: '/app/kibana#/something?_g=something' }],
    forceNow,
    headers: encryptedHeaders
  }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, ['http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'], undefined, null, undefined, undefined);
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);

  await executeJob({ objects: [{ relativeUrl: '/app/kibana#/something' }], headers: encryptedHeaders }, cancellationToken);

  expect(generatePdfObservable).toBeCalledWith(undefined, ['http://localhost:5601/sbp/app/kibana#/something'], undefined, null, undefined, undefined);
});

test(`returns content_type of application/pdf`, async () => {
  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encrypt({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob({ objects: [], timeRange: {}, headers: encryptedHeaders }, cancellationToken);
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from(testContent)));

  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encrypt({});
  const { content } = await executeJob({ objects: [], timeRange: {}, headers: encryptedHeaders }, cancellationToken);

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
