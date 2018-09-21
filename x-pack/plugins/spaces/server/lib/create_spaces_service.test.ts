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

const createMockServer = (config: any, simulateInvalidSpace = false) => {
  const spacesClient = {
    getScopedClient: (request: any) => {
      return {
        get: async (spaceId: string) => {
          if (simulateInvalidSpace) {
            throw new Error('Not Found!');
          }

          return {
            id: spaceId,
            name: `test space ${spaceId}`,
          };
        },
      };
    },
  };

  return {
    config: jest.fn(() => {
      return {
        get: jest.fn((key: string) => {
          return config[key];
        }),
      };
    }),
    plugins: {
      spaces: {
        spacesClient,
      },
    },
  };
};

describe('getSpaceId', () => {
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
});

describe('getActiveSpace', () => {
  test('returns the current space', async () => {
    const request = createRequest('my-space-context');
    const server = createMockServer({
      'server.basePath': '',
    });

    const service = createSpacesService(server);
    expect(await service.getActiveSpace(request)).toEqual({
      id: 'my-space-context',
      name: 'test space my-space-context',
    });
  });

  test('throws when the current space cannot be found', async () => {
    const request = createRequest('my-space-context');
    const server = createMockServer(
      {
        'server.basePath': '',
      },
      true
    );

    const service = createSpacesService(server);
    expect(service.getActiveSpace(request)).rejects.toThrowErrorMatchingSnapshot();
  });

  test('caches subsequent calls to getActiveSpace within the same request', () => {
    const request = createRequest('my-space-context');
    const anotherRequest = createRequest('my-space-context');
    const server = createMockServer({
      'server.basePath': '',
    });

    const service = createSpacesService(server);

    const call1 = service.getActiveSpace(request);
    const call2 = service.getActiveSpace(request);

    const anotherRequestCall1 = service.getActiveSpace(anotherRequest);
    const anotherRequestCall2 = service.getActiveSpace(anotherRequest);

    expect(call1).toBe(call2);
    expect(anotherRequestCall1).toBe(anotherRequestCall2);

    expect(call1).not.toBe(anotherRequestCall1);
  });
});
