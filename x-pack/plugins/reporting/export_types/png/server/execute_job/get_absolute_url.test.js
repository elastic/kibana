/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import { getAbsoluteUrlFactory } from './get_absolute_url';

const createMockServer = ({ settings = {} } = {}) => {
  const mockServer = {
    expose: () => {},
    config: memoize(() => {
      return {
        get: jest.fn()
      };
    }),
    info: {
      protocol: 'http'
    }
  };

  const defaultSettings = {
    'server.host': 'something',
    'server.port': 8080,
    'server.basePath': '/tst',
    'xpack.reporting.kibanaServer': {}
  };
  mockServer.config().get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  return mockServer;
};

test(`by default it builds url using information from server.info.protocol and the server.config`, () => {
  const mockServer = createMockServer();

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`http://something:8080/tst/app/kibana`);
});

test(`uses kibanaServer.protocol if specified`, () => {
  const settings = {
    'xpack.reporting.kibanaServer.protocol': 'https'
  };
  const mockServer = createMockServer({ settings });

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`https://something:8080/tst/app/kibana`);
});

test(`uses kibanaServer.hostname if specified`, () => {
  const settings = {
    'xpack.reporting.kibanaServer.hostname': 'something-else'
  };
  const mockServer = createMockServer({ settings });

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`http://something-else:8080/tst/app/kibana`);
});

test(`uses kibanaServer.port if specified`, () => {
  const settings = {
    'xpack.reporting.kibanaServer.port': 8008
  };
  const mockServer = createMockServer({ settings });

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`http://something:8008/tst/app/kibana`);
});

test(`uses the provided hash`, () => {
  const mockServer = createMockServer();

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const hash = '/hash';
  const absoluteUrl = getAbsoluteUrl({ hash });
  expect(absoluteUrl).toBe(`http://something:8080/tst/app/kibana#${hash}`);
});

test(`uses the provided hash with queryString`, () => {
  const mockServer = createMockServer();

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const hash = '/hash?querystring';
  const absoluteUrl = getAbsoluteUrl({ hash });
  expect(absoluteUrl).toBe(`http://something:8080/tst/app/kibana#${hash}`);
});

test(`uses the path`, () => {
  const mockServer = createMockServer();

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const path = '/app/canvas';
  const absoluteUrl = getAbsoluteUrl({ path });
  expect(absoluteUrl).toBe(`http://something:8080/tst${path}`);
});

test(`uses the search`, () => {
  const mockServer = createMockServer();

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const search = '_t=123456789';
  const absoluteUrl = getAbsoluteUrl({ search });
  expect(absoluteUrl).toBe(`http://something:8080/tst/app/kibana?${search}`);
});
