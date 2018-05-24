/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { initSpacesApi } from './spaces';
import { initSelectedSpaceState } from '../../../lib/selected_space_state';

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
  id: 'space:a-space',
  attributes: {
    name: 'a space',
    urlContext: 'a-space',
  }
}, {
  id: 'space:b-space',
  attributes: {
    name: 'b space',
    urlContext: 'b-space',
  }
}, {
  id: 'space:default',
  attributes: {
    name: 'Default Space',
    urlContext: '',
    _reserved: true
  }
}];

describe('Spaces API', () => {
  const teardowns = [];
  let request;

  const config = {
    'server.ssl.enabled': true,
    'server.basePath': '',
    'xpack.spaces.rememberSelectedSpace': true
  };

  beforeEach(() => {
    request = async (method, path, setupFn = () => { }) => {

      const server = new Server();

      server.connection({ port: 0 });

      await setupFn(server);

      server.decorate('server', 'config', jest.fn(() => {
        return {
          get: (key) => config[key]
        };
      }));

      initSelectedSpaceState(server, server.config());
      initSpacesApi(server);

      server.decorate('request', 'getBasePath', jest.fn());
      server.decorate('request', 'setBasePath', jest.fn());

      // Mock server.getSavedObjectsClient()
      server.decorate('request', 'getSavedObjectsClient', () => {
        return {
          get: jest.fn((type, id) => {
            return spaces.filter(s => s.id === `${type}:${id}`)[0];
          }),
          find: jest.fn(() => {
            return {
              total: spaces.length,
              saved_objects: spaces
            };
          }),
          delete: jest.fn()
        };
      });

      teardowns.push(() => server.stop());

      return await server.inject({
        method,
        url: path,
      });
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test(`'GET spaces' returns all available spaces`, async () => {
    const response = await request('GET', '/api/spaces/v1/spaces');

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(200);
    const resultSpaces = JSON.parse(payload);
    expect(resultSpaces.map(s => s.id)).toEqual(spaces.map(s => s.id));
  });

  test(`'GET spaces/{id}' returns the space with that id`, async () => {
    const response = await request('GET', '/api/spaces/v1/space/default');

    const {
      statusCode,
      payload
    } = response;

    expect(statusCode).toEqual(200);
    const resultSpace = JSON.parse(payload);
    expect(resultSpace.id).toEqual('space:default');
  });

  test(`'DELETE spaces/{id}' deletes the space`, async () => {
    const response = await request('DELETE', '/api/spaces/v1/space/a-space');

    const {
      statusCode
    } = response;

    expect(statusCode).toEqual(204);
  });

  test(`'DELETE spaces/{id}' cannot delete reserved spaces`, async () => {
    const response = await request('DELETE', '/api/spaces/v1/space/default');

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

  test('PUT space/{id}/select should set a cookie with the new Space, and respond with a new location', async () => {
    const response = await request('PUT', '/api/spaces/v1/space/a-space/select');

    const {
      statusCode,
      headers,
      payload
    } = response;

    expect(statusCode).toEqual(200);

    expect(headers).toHaveProperty('set-cookie');
    expect(headers['set-cookie']).toHaveLength(1);
    const [nameValuePair] = headers['set-cookie'][0].split(';').map(a => a.trim());
    expect(nameValuePair).toEqual('selectedSpace=a-space');

    const result = JSON.parse(payload);
    expect(result.location).toEqual('/s/a-space');
  });
});
