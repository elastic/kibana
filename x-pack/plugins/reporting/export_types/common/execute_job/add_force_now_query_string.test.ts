/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
// import { KbnServer } from '../../../types';
import { addForceNowQuerystring } from './index';

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

test(`fails if no URL is passed`, async () => {
  await expect(
    addForceNowQuerystring({
      job: {},
      server: mockServer,
    })
  ).rejects.toBeDefined();
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const { urls } = await addForceNowQuerystring({
    job: { relativeUrl: '/app/kibana#/something', forceNow },
    server: mockServer,
  });

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';

  const { urls } = await addForceNowQuerystring({
    job: {
      relativeUrl: '/app/kibana#/something?_g=something',
      forceNow,
    },
    server: mockServer,
  });

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const { urls } = await addForceNowQuerystring({
    job: {
      relativeUrl: '/app/kibana#/something',
    },
    server: mockServer,
  });

  expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something');
});
