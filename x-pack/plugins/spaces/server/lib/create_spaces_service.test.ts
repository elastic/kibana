/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../common/constants';
import { createSpacesService } from './create_spaces_service';

const createRequest = (spaceId?: string, serverBasePath = '') => ({
  getBasePath: () =>
    spaceId && spaceId !== DEFAULT_SPACE_ID ? `${serverBasePath}/s/${spaceId}` : serverBasePath,
});

const createMockServer = (config: any) => {
  return {
    config: jest.fn(() => {
      return {
        get: jest.fn((key: string) => {
          return config[key];
        }),
      };
    }),
  };
};

test('returns the default space ID', () => {
  const server = createMockServer({
    'server.basePath': '',
  });

  const service = createSpacesService(server);
  expect(service.getSpaceId(createRequest())).toEqual(DEFAULT_SPACE_ID);
});

test('returns the id for the current space', () => {
  const request = createRequest('my-space-context');
  const server = createMockServer({
    'server.basePath': '',
  });

  const service = createSpacesService(server);
  expect(service.getSpaceId(request)).toEqual('my-space-context');
});

test(`returns the id for the current space when a server basepath is defined`, () => {
  const request = createRequest('my-space-context', '/foo');
  const server = createMockServer({
    'server.basePath': '/foo',
  });

  const service = createSpacesService(server);
  expect(service.getSpaceId(request)).toEqual('my-space-context');
});

test(`returns true if the current space is the default one`, () => {
  const request = createRequest(DEFAULT_SPACE_ID, '/foo');
  const server = createMockServer({
    'server.basePath': '/foo',
  });

  const service = createSpacesService(server);
  expect(service.isInDefaultSpace(request)).toEqual(true);
});

test(`returns false if the current space is not the default one`, () => {
  const request = createRequest('my-space-context', '/foo');
  const server = createMockServer({
    'server.basePath': '/foo',
  });

  const service = createSpacesService(server);
  expect(service.isInDefaultSpace(request)).toEqual(false);
});
