/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSpacesService } from "./create_spaces_service";

const createRequest = (urlContext, serverBasePath = '') => ({
  getBasePath: () => urlContext ? `${serverBasePath}/s/${urlContext}` : serverBasePath
});

const createMockServer = (config) => {
  return {
    config: jest.fn(() => {
      return {
        get: jest.fn((key) => {
          return config[key];
        })
      };
    })
  };
};

test('returns empty string for the default space', () => {
  const server = createMockServer({
    'server.basePath': ''
  });

  const service = createSpacesService(server);
  expect(service.getUrlContext(createRequest())).toEqual('');
});

test('returns the urlContext for the current space', () => {
  const request = createRequest('my-space-context');
  const server = createMockServer({
    'server.basePath': ''
  });

  const service = createSpacesService(server);
  expect(service.getUrlContext(request)).toEqual('my-space-context');
});

test(`returns the urlContext for the current space when a server basepath is defined`, () => {
  const request = createRequest('my-space-context', '/foo');
  const server = createMockServer({
    'server.basePath': '/foo'
  });

  const service = createSpacesService(server);
  expect(service.getUrlContext(request)).toEqual('my-space-context');
});
