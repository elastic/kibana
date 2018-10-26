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

  generatePngObservableFactory.mockReturnValue(jest.fn());
});

afterEach(() => generatePngObservableFactory.mockReset());

const encrypt = async (headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe(`sessionCookie`, () => {
  test(`Fails if no relativeURL is passed in`, async () => {
    const executeJob = executeJobFactory(mockServer);
    const encryptedHeaders = await encrypt({});

    const generatePngObservable = generatePngObservableFactory();
    generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

    await expect(executeJob({ headers: encryptedHeaders }, cancellationToken))
      .rejects
      .toThrowErrorMatchingSnapshot();
  });

  test(`if serializedSession doesn't exist it doesn't pass sessionCookie to generatePngObservable`, async () => {
    mockServer.plugins.security = {};
    const headers = {};
    const encryptedHeaders = await encrypt(headers);

    const generatePngObservable = generatePngObservableFactory();
    generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const executeJob = executeJobFactory(mockServer);
    await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders, session: null }, cancellationToken);

    expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, null, undefined);
  });

  test(`if uses xpack.reporting.kibanaServer.hostname for domain of sessionCookie passed to generatePngObservable`, async () => {
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

    const generatePngObservable = generatePngObservableFactory();
    generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const executeJob = executeJobFactory(mockServer);
    await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders, session: encryptedSession }, cancellationToken);

    expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, {
      domain: config['xpack.reporting.kibanaServer.hostname'],
      httpOnly: sessionCookieOptions.httpOnly,
      name: sessionCookieOptions.name,
      path: sessionCookieOptions.path,
      sameSite: 'Strict',
      secure: sessionCookieOptions.secure,
      value: session
    }, undefined);
  });

  test(`if uses server.host and reporting config isn't set for domain of sessionCookie passed to generatePngObservable`, async () => {
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

    const generatePngObservable = generatePngObservableFactory();
    generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

    const executeJob = executeJobFactory(mockServer);
    await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders, session: encryptedSession }, cancellationToken);

    expect(generatePngObservable).toBeCalledWith('http://something.com:5601/sbp/app/kibana#/something', undefined, {
      domain: config['server.host'],
      httpOnly: sessionCookieOptions.httpOnly,
      name: sessionCookieOptions.name,
      path: sessionCookieOptions.path,
      sameSite: 'Strict',
      secure: sessionCookieOptions.secure,
      value: session
    }, undefined);
  });
});

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const browserTimezone = 'UTC';
  await executeJob({ relativeUrl: '/app/kibana#/something', browserTimezone, headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', browserTimezone, null, undefined);
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({ relativeUrl: '/app/kibana#/something', forceNow, headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z', undefined, null, undefined);
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const forceNow = '2000-01-01T00:00:00.000Z';

  await executeJob({
    relativeUrl: '/app/kibana#/something?_g=something',
    forceNow,
    headers: encryptedHeaders
  }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z', undefined, null, undefined);
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const encryptedHeaders = await encrypt({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);

  await executeJob({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith('http://localhost:5601/sbp/app/kibana#/something', undefined, null, undefined);
});

test(`returns content_type of image/png`, async () => {
  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encrypt({});

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
  const encryptedHeaders = await encrypt({});
  const { content } = await executeJob({ relativeUrl: '/app/kibana#/something',
    timeRange: {}, headers: encryptedHeaders }, cancellationToken);

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
