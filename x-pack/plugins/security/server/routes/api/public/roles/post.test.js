/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Boom from 'boom';
import { initPostRolesApi } from './post';

const application = 'kibana-.kibana';

const createMockServer = () => {
  const mockServer = new Hapi.Server({ debug: false });
  mockServer.connection({ port: 8080 });
  return mockServer;
};

const defaultPreCheckLicenseImpl = (request, reply) => reply();

const postRoleTest = (
  description,
  { name, payload, preCheckLicenseImpl, asserts }
) => {
  test(description, async () => {
    const mockServer = createMockServer();
    const mockPreCheckLicense = jest
      .fn()
      .mockImplementation(preCheckLicenseImpl);
    const mockCallWithRequest = jest.fn();
    initPostRolesApi(
      mockServer,
      mockCallWithRequest,
      mockPreCheckLicense,
      application
    );
    const headers = {
      authorization: 'foo',
    };

    const request = {
      method: 'POST',
      url: `/api/security/roles/${name}`,
      headers,
      payload,
    };
    const { result, statusCode } = await mockServer.inject(request);

    if (preCheckLicenseImpl) {
      expect(mockPreCheckLicense).toHaveBeenCalled();
    } else {
      expect(mockPreCheckLicense).not.toHaveBeenCalled();
    }
    expect(mockCallWithRequest).not.toHaveBeenCalled();
    expect(statusCode).toBe(asserts.statusCode);
    expect(result).toEqual(asserts.result);
  });
};

describe('POST role', () => {
  describe('failure', () => {
    postRoleTest(`requires name in params`, {
      name: '',
      payload: {},
      asserts: {
        statusCode: 404,
        result: {
          error: 'Not Found',
          statusCode: 404,
        },
      },
    });

    postRoleTest(`requires name in params to not exceed 1024 characters`, {
      name: 'a'.repeat(1025),
      payload: {},
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          message: `child "name" fails because ["name" length must be less than or equal to 1024 characters long]`,
          statusCode: 400,
          validation: {
            keys: ["name"],
            source: 'params'
          }
        },
      },
    });

    postRoleTest(`returns result of routePreCheckLicense`, {
      name: 'foo-role',
      payload: {},
      preCheckLicenseImpl: (request, reply) =>
        reply(Boom.forbidden('test forbidden message')),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });
  });
});
