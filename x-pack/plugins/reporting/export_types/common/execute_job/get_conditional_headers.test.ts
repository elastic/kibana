/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import { getConditionalHeaders, getCustomLogo } from './index';

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

describe('conditions', () => {
  test(`uses hostname from reporting config if set`, async () => {
    config['xpack.reporting.kibanaServer.hostname'] = 'custom-hostname';
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {},
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.hostname).toEqual(
      config['xpack.reporting.kibanaServer.hostname']
    );
  });

  test(`uses hostname from server.config if reporting config not set`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {},
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.hostname).toEqual(config['server.host']);
  });

  test(`uses port from reporting config if set`, async () => {
    config['xpack.reporting.kibanaServer.port'] = 443;

    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {},
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.port).toEqual(config['xpack.reporting.kibanaServer.port']);
  });

  test(`uses port from server if reporting config not set`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {},
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.port).toEqual(config['server.port']);
  });

  test(`uses basePath from server config`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {},
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.basePath).toEqual(config['server.basePath']);
  });

  test(`uses protocol from reporting config if set`, async () => {
    config['xpack.reporting.kibanaServer.protocol'] = 'https';
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {},
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.protocol).toEqual(
      config['xpack.reporting.kibanaServer.protocol']
    );
  });

  test(`uses protocol from server.info`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {},
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.protocol).toEqual(mockServer.info.protocol);
  });
});

test('uses basePath from job when creating saved object service', async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({
    job: {},
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const jobBasePath = '/sbp/s/marketing';
  await getCustomLogo({
    job: { basePath: jobBasePath },
    conditionalHeaders,
    server: mockServer,
  });

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe(
    jobBasePath
  );
});

test(`uses basePath from server if job doesn't have a basePath when creating saved object service`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({
    job: {},
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  await getCustomLogo({
    job: {},
    conditionalHeaders,
    server: mockServer,
  });

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe(
    '/sbp'
  );
});
