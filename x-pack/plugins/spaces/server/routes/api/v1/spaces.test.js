/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { initSpacesApi } from './spaces';

jest.mock('../../../lib/route_pre_check_license', () => {
  return {
    routePreCheckLicense: () => (request, reply) => reply.continue()
  };
});

jest.mock('../../../../../../server/lib/get_client_shield', () => {
  return {
    getClient: () => {
      return {
        callWithInternalUser: jest.fn(() => { })
      };
    }
  };
});

const spaces = [{
  id: 'a-space',
  name: 'a space',
}, {
  id: 'b-space',
  name: 'b space',
}, {
  id: 'default',
  name: 'Default Space',
  _reserved: true,
}];

describe('Spaces API', () => {
  const teardowns = [];
  let request;

  const baseConfig = {
    'server.basePath': ''
  };

  beforeEach(() => {
    request = async (method, path, options = {}) => {

      const {
        setupFn = () => { },
        testConfig = {},
        payload,
      } = options;

      const server = new Server();

      const config = {
        ...baseConfig,
        ...testConfig
      };

      server.connection({ port: 0 });

      await setupFn(server);

      server.decorate('server', 'config', jest.fn(() => {
        return {
          get: (key) => config[key]
        };
      }));

      initSpacesApi(server);

      server.decorate('request', 'getBasePath', jest.fn());
      server.decorate('request', 'setBasePath', jest.fn());

      const mockSpacesClient = {
        getAll: jest.fn(() => {
          return spaces;
        }),
        get: jest.fn((id) => {
          return spaces.find(s => s.id === id);
        }),
        find: jest.fn(() => {
          return {
            total: spaces.length,
            saved_objects: spaces
          };
        }),
        create: jest.fn(() => ({})),
        update: jest.fn(() => ({})),
        delete: jest.fn(),
        errors: {
          isNotFoundError: jest.fn(() => true)
        }
      };

      server.plugins = {
        spaces: {
          spacesClient: {
            getScopedClient: jest.fn().mockReturnValue(mockSpacesClient)
          }
        }
      };

      teardowns.push(() => server.stop());

      const headers = {
        authorization: 'foo',
      };

      const result = {
        server,
        mockSpacesClient,
        headers,
        response: await server.inject({
          method,
          url: path,
          payload,
          headers,
        })
      };

      expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          authorization: headers.authorization,
        }),
      }));

      return result;
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test(`'GET spaces' returns all available spaces`, async () => {
    const { server, headers, response } = await request('GET', '/api/spaces/v1/spaces');

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(200);
    const resultSpaces = JSON.parse(payload);
    expect(resultSpaces.map(s => s.id)).toEqual(spaces.map(s => s.id));
    expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        authorization: headers.authorization,
      }),
    }));
  });

  test(`'GET spaces/{id}' returns the space with that id`, async () => {
    const { response } = await request('GET', '/api/spaces/v1/space/default');

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(200);
    const resultSpace = JSON.parse(payload);
    expect(resultSpace.id).toEqual('default');
  });

  test(`'DELETE spaces/{id}' deletes the space`, async () => {
    const { response } = await request('DELETE', '/api/spaces/v1/space/a-space');

    const {
      statusCode
    } = response;

    expect(statusCode).toEqual(204);
  });

  test('POST /space should create a new space with the provided ID', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
    };

    const { mockSpacesClient, response } = await request('POST', '/api/spaces/v1/space', { payload });

    const {
      statusCode,
    } = response;

    expect(statusCode).toEqual(200);
    expect(mockSpacesClient.create).toHaveBeenCalledTimes(1);
    expect(mockSpacesClient.create)
      .toHaveBeenCalledWith({  id: 'my-space-id', name: 'my new space', description: 'with a description' });
  });

  test('PUT /space should update an existing space with the provided ID', async () => {
    const payload = {
      name: 'my updated space',
      description: 'with a description',
    };

    const { mockSpacesClient, response } = await request('PUT', '/api/spaces/v1/space/a-space', { payload });

    const {
      statusCode,
    } = response;

    expect(statusCode).toEqual(200);
    expect(mockSpacesClient.update).toHaveBeenCalledTimes(1);
    expect(mockSpacesClient.update)
      .toHaveBeenCalledWith('a-space', { name: 'my updated space', description: 'with a description' });
  });

  test('POST space/{id}/select should respond with the new space location', async () => {
    const { response } = await request('POST', '/api/spaces/v1/space/a-space/select');

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(200);

    const result = JSON.parse(payload);
    expect(result.location).toEqual('/s/a-space');
  });

  test('POST space/{id}/select should respond with the new space location when a server.basePath is in use', async () => {
    const testConfig = {
      'server.basePath': '/my/base/path'
    };

    const { response } = await request('POST', '/api/spaces/v1/space/a-space/select', { testConfig });

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(200);

    const result = JSON.parse(payload);
    expect(result.location).toEqual('/my/base/path/s/a-space');
  });
});
