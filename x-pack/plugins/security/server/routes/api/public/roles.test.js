/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import Boom from 'boom';
import { initRolesApi } from './roles';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
jest.mock('../../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));
jest.mock('../../../lib/route_pre_check_license', () => ({
  routePreCheckLicense: jest.fn(),
}));

beforeEach(() => {
  getClient.mockReset();
  routePreCheckLicense.mockReset();
});

const registerMockCallWithRequest = () => {
  const callWithRequest = jest.fn();
  getClient.mockReturnValue({
    callWithRequest,
  });
  return callWithRequest;
};

const createMockServer = () => {
  const mockConfig = { get: jest.fn() };
  const mockServer = new Hapi.Server({ debug: false });
  mockServer.config = () => mockConfig;
  mockServer.connection({ port: 8080 });
  mockServer.plugins = {
    security: {
      authorization: {
        application: 'kibana-.kibana'
      }
    }
  };
  return mockServer;
};

const mockRoutePreCheckLicense = impl => {
  const routePreCheckLicenseImpl = jest.fn().mockImplementation(impl);
  routePreCheckLicense.mockReturnValue(routePreCheckLicenseImpl);
  return routePreCheckLicenseImpl;
};

describe('GET', () => {
  test(`returns result of routePreCheckLicense`, async () => {
    const message = 'test forbidden message';
    const mockServer = createMockServer();
    const pre = mockRoutePreCheckLicense((request, reply) =>
      reply(Boom.forbidden(message))
    );
    registerMockCallWithRequest();
    initRolesApi(mockServer);

    const request = {
      method: 'GET',
      url: '/api/security/roles',
    };
    const { result, statusCode } = await mockServer.inject(request);

    expect(pre).toHaveBeenCalled();
    expect(statusCode).toBe(403);
    expect(result).toEqual({ error: 'Forbidden', statusCode: 403, message });
  });

  test(`returns error from callWithRequest`, async () => {
    const message = 'test not acceptable message';
    const mockServer = createMockServer();
    const pre = mockRoutePreCheckLicense((request, reply) => reply());
    const mockCallWithRequest = registerMockCallWithRequest();
    mockCallWithRequest.mockImplementation(async () => {
      throw Boom.notAcceptable(message);
    });
    initRolesApi(mockServer);

    const request = {
      method: 'GET',
      url: '/api/security/roles',
    };
    const { result, statusCode } = await mockServer.inject(request);

    expect(pre).toHaveBeenCalled();
    expect(statusCode).toBe(406);
    expect(result).toEqual({
      error: 'Not Acceptable',
      statusCode: 406,
      message,
    });
  });

  test(`transforms response from callWithRequest`, async () => {
    const mockServer = createMockServer();
    const pre = mockRoutePreCheckLicense((request, reply) => reply());
    const mockCallWithRequest = registerMockCallWithRequest();
    mockCallWithRequest.mockImplementation(async () => ({
      first_role: {
        cluster: ['manage_watcher'],
        indices: [
          {
            names: ['.kibana*'],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
        applications: [
          {
            application: 'kibana-.kibana',
            privileges: ['read'],
            resources: ['*'],
          },
        ],
        run_as: ['other_user'],
        metadata: {
          _reserved: true,
        },
        transient_metadata: {
          enabled: true,
        },
      },
    }));
    initRolesApi(mockServer);

    const request = {
      method: 'GET',
      url: '/api/security/roles',
    };
    const { result, statusCode } = await mockServer.inject(request);

    expect(pre).toHaveBeenCalled();
    expect(statusCode).toBe(200);
    expect(result).toEqual([
      {
        name: 'first_role',
        metadata: {
          _reserved: true,
        },
        transient_metadata: {
          enabled: true,
        },
        elasticsearch: {
          cluster: ['manage_watcher'],
          indices: [
            {
              names: ['.kibana*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
          run_as: ['other_user'],
        },
        kibana: [
          {
            privileges: ['read'],
          }
        ],
      },
    ]);
  });
});
