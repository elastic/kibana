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

test(`gets logo from uiSettings`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({
    job: {},
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  const { logo } = await getCustomLogo({
    job: {},
    conditionalHeaders,
    server: mockServer,
  });

  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
});
