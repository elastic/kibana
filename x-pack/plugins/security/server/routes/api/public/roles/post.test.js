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
  { name, payload, preCheckLicenseImpl, callWithRequestImpls = [], asserts }
) => {
  test(description, async () => {
    const mockServer = createMockServer();
    const mockPreCheckLicense = jest
      .fn()
      .mockImplementation(preCheckLicenseImpl);
    const mockCallWithRequest = jest.fn();
    for (const impl of callWithRequestImpls) {
      mockCallWithRequest.mockImplementationOnce(impl);
    }
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

    expect(result).toEqual(asserts.result);
    expect(statusCode).toBe(asserts.statusCode);
    if (preCheckLicenseImpl) {
      expect(mockPreCheckLicense).toHaveBeenCalled();
    } else {
      expect(mockPreCheckLicense).not.toHaveBeenCalled();
    }
    if (asserts.callWithRequests) {
      for (const args of asserts.callWithRequests) {
        expect(mockCallWithRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          }),
          ...args
        );
      }
    } else {
      expect(mockCallWithRequest).not.toHaveBeenCalled();
    }
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
            keys: ['name'],
            source: 'params',
          },
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

  describe('success', () => {
    postRoleTest(`creates empty role`, {
      name: 'foo-role',
      payload: {},
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => {}],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [],
              },
            },
          ],
        ],
        statusCode: 200,
        result: null,
      },
    });

    postRoleTest(`creates role with everything`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        transient_metadata: {
          quz: true,
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            privileges: ['test-kibana-privilege-1', 'test-kibana-privilege-2'],
          },
          {
            privileges: ['test-kibana-privilege-3'],
          },
        ],
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => {}],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                applications: [
                  {
                    application,
                    privileges: [
                      'test-kibana-privilege-1',
                      'test-kibana-privilege-2',
                    ],
                    resources: ['*'],
                  },
                  {
                    application,
                    privileges: ['test-kibana-privilege-3'],
                    resources: ['*'],
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: [
                      'test-index-privilege-1',
                      'test-index-privilege-2',
                    ],
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
                transient_metadata: { quz: true },
              },
              name: 'foo-role',
            },
          ],
        ],
        statusCode: 200,
        result: null,
      },
    });
  });
});
