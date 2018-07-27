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
  attributes: {
    name: 'a space',
  }
}, {
  id: 'b-space',
  attributes: {
    name: 'b space',
  }
}, {
  id: 'default',
  attributes: {
    name: 'Default Space',
    _reserved: true
  }
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

      // Mock server.getSavedObjectsClient()
      const mockSavedObjectsClient = {
        get: jest.fn((type, id) => {
          return spaces.filter(s => s.id === id)[0];
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

      server.decorate('request', 'getSavedObjectsClient', () => mockSavedObjectsClient);

      teardowns.push(() => server.stop());

      return {
        server,
        mockSavedObjectsClient,
        response: await server.inject({
          method,
          url: path,
          payload,
        })
      };
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test(`'GET spaces' returns all available spaces`, async () => {
    const { response } = await request('GET', '/api/spaces/v1/spaces');

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(200);
    const resultSpaces = JSON.parse(payload);
    expect(resultSpaces.map(s => s.id)).toEqual(spaces.map(s => s.id));
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

  test(`'DELETE spaces/{id}' cannot delete reserved spaces`, async () => {
    const { response } = await request('DELETE', '/api/spaces/v1/space/default');

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(400);
    expect(JSON.parse(payload)).toEqual({
      statusCode: 400,
      error: "Bad Request",
      message: "This Space cannot be deleted because it is reserved."
    });
  });

  test('POST /space should create a new space with the provided ID', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
    };

    const { mockSavedObjectsClient, response } = await request('POST', '/api/spaces/v1/space', { payload });

    const {
      statusCode,
    } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsClient.create)
      .toHaveBeenCalledWith('space', { name: 'my new space', description: 'with a description' }, { id: 'my-space-id', overwrite: false });
  });

  test('POST /space should not allow a space to be updated', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
    };

    const { response } = await request('POST', '/api/spaces/v1/space', { payload });

    const {
      statusCode,
      payload: responsePayload,
    } = response;

    expect(statusCode).toEqual(409);
    expect(JSON.parse(responsePayload)).toEqual({
      error: 'Conflict',
      message: "A space with the identifier a-space already exists. Please choose a different identifier",
      statusCode: 409
    });
  });

  test('PUT /space should update an existing space with the provided ID', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
    };

    const { mockSavedObjectsClient, response } = await request('PUT', '/api/spaces/v1/space/a-space', { payload });

    const {
      statusCode,
    } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsClient.update)
      .toHaveBeenCalledWith('space', 'a-space', { name: 'my updated space', description: 'with a description' });
  });

  test('PUT /space should not allow a new space to be created', async () => {
    const payload = {
      id: 'a-new-space',
      name: 'my new space',
      description: 'with a description',
    };

    const { response } = await request('PUT', '/api/spaces/v1/space/a-new-space', { payload });

    const {
      statusCode,
    } = response;

    expect(statusCode).toEqual(404);
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
