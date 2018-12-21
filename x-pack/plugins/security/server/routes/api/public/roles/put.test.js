/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Boom from 'boom';
import { initPutRolesApi } from './put';
import { defaultValidationErrorHandler } from '../../../../../../../../src/core/server/http/http_tools';
import { GLOBAL_RESOURCE } from '../../../../../common/constants';

const application = 'kibana-.kibana';

const createMockServer = () => {
  const mockServer = new Hapi.Server({
    debug: false,
    port: 8080,
    routes: {
      validate: {
        failAction: defaultValidationErrorHandler
      }
    }
  });
  return mockServer;
};

const defaultPreCheckLicenseImpl = () => null;

const privilegeMap = {
  global: {
    'test-global-privilege-1': [],
    'test-global-privilege-2': [],
    'test-global-privilege-3': [],
  },
  space: {
    'test-space-privilege-1': [],
    'test-space-privilege-2': [],
    'test-space-privilege-3': [],
  }
};

const putRoleTest = (
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
    initPutRolesApi(
      mockServer,
      mockCallWithRequest,
      mockPreCheckLicense,
      privilegeMap,
      application,
    );
    const headers = {
      authorization: 'foo',
    };

    const request = {
      method: 'PUT',
      url: `/api/security/role/${name}`,
      headers,
      payload,
    };
    const response = await mockServer.inject(request);
    const { result, statusCode } = response;

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

describe('PUT role', () => {
  describe('failure', () => {
    putRoleTest(`requires name in params`, {
      name: '',
      payload: {},
      asserts: {
        statusCode: 404,
        result: {
          error: 'Not Found',
          message: 'Not Found',
          statusCode: 404,
        },
      },
    });

    putRoleTest(`requires name in params to not exceed 1024 characters`, {
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

    putRoleTest(`only allows known Kibana global privileges`, {
      name: 'foo-role',
      payload: {
        kibana: {
          global: ['foo']
        }
      },
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          //eslint-disable-next-line max-len
          message: `child \"kibana\" fails because [child \"global\" fails because [\"global\" at position 0 fails because [\"0\" must be one of [test-global-privilege-1, test-global-privilege-2, test-global-privilege-3]]]]`,
          statusCode: 400,
          validation: {
            keys: ['kibana.global.0'],
            source: 'payload',
          },
        },
      },
    });

    putRoleTest(`only allows known Kibana space privileges`, {
      name: 'foo-role',
      payload: {
        kibana: {
          space: {
            quz: ['foo']
          }
        }
      },
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          //eslint-disable-next-line max-len
          message: `child \"kibana\" fails because [child \"space\" fails because [child \"quz\" fails because [\"quz\" at position 0 fails because [\"0\" must be one of [test-space-privilege-1, test-space-privilege-2, test-space-privilege-3]]]]]`,
          statusCode: 400,
          validation: {
            keys: ['kibana.space.quz.0'],
            source: 'payload',
          },
        },
      },
    });

    putRoleTest(`doesn't allow * space ID`, {
      name: 'foo-role',
      payload: {
        kibana: {
          space: {
            '*': ['test-space-privilege-1']
          }
        }
      },
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          message: `child \"kibana\" fails because [child \"space\" fails because [\"*\" is not allowed]]`,
          statusCode: 400,
          validation: {
            keys: ['kibana.space.&#x2a;'],
            source: 'payload',
          },
        },
      },
    });

    putRoleTest(`doesn't allow * in a space ID`, {
      name: 'foo-role',
      payload: {
        kibana: {
          space: {
            'foo-*': ['test-space-privilege-1']
          }
        }
      },
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          message: `child \"kibana\" fails because [child \"space\" fails because [\"foo-*\" is not allowed]]`,
          statusCode: 400,
          validation: {
            keys: ['kibana.space.foo-&#x2a;'],
            source: 'payload',
          },
        },
      },
    });

    putRoleTest(`returns result of routePreCheckLicense`, {
      name: 'foo-role',
      payload: {},
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
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
    putRoleTest(`creates empty role`, {
      name: 'foo-role',
      payload: {},
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => { }],
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
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`creates role with everything`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              field_security: {
                grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                except: ['test-field-security-except-1', 'test-field-security-except-2']
              },
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
              query: `{ "match": { "title": "foo" } }`,
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: {
          global: ['test-global-privilege-1', 'test-global-privilege-2', 'test-global-privilege-3'],
          space: {
            'test-space-1': ['test-space-privilege-1', 'test-space-privilege-2'],
            'test-space-2': ['test-space-privilege-3'],
          }
        },
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => { }],
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
                      'test-global-privilege-1',
                      'test-global-privilege-2',
                      'test-global-privilege-3'
                    ],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: [
                      'space_test-space-privilege-1',
                      'space_test-space-privilege-2'
                    ],
                    resources: ['space:test-space-1']
                  },
                  {
                    application,
                    privileges: [
                      'space_test-space-privilege-3',
                    ],
                    resources: ['space:test-space-2']
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    field_security: {
                      grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                      except: ['test-field-security-except-1', 'test-field-security-except-2']
                    },
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: [
                      'test-index-privilege-1',
                      'test-index-privilege-2',
                    ],
                    query: `{ "match": { "title": "foo" } }`,
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`updates role which has existing kibana privileges`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              field_security: {
                grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                except: ['test-field-security-except-1', 'test-field-security-except-2']
              },
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
              query: `{ "match": { "title": "foo" } }`,
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: {
          global: ['test-global-privilege-1', 'test-global-privilege-2', 'test-global-privilege-3'],
          space: {
            'test-space-1': ['test-space-privilege-1', 'test-space-privilege-2'],
            'test-space-2': ['test-space-privilege-3'],
          }
        },
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [
        async () => ({
          'foo-role': {
            metadata: {
              bar: 'old-metadata',
            },
            transient_metadata: {
              enabled: true,
            },
            cluster: ['old-cluster-privilege'],
            indices: [
              {
                field_security: {
                  grant: ['old-field-security-grant-1', 'old-field-security-grant-2'],
                  except: ['old-field-security-except-1', 'old-field-security-except-2']
                },
                names: ['old-index-name'],
                privileges: ['old-privilege'],
                query: `{ "match": { "old-title": "foo" } }`,
              },
            ],
            run_as: ['old-run-as'],
            applications: [
              {
                application,
                privileges: ['old-kibana-privilege'],
                resources: ['old-resource'],
              },
            ],
          },
        }),
        async () => { },
      ],
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
                      'test-global-privilege-1',
                      'test-global-privilege-2',
                      'test-global-privilege-3'
                    ],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: [
                      'space_test-space-privilege-1',
                      'space_test-space-privilege-2'
                    ],
                    resources: ['space:test-space-1']
                  },
                  {
                    application,
                    privileges: [
                      'space_test-space-privilege-3',
                    ],
                    resources: ['space:test-space-2']
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    field_security: {
                      grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                      except: ['test-field-security-except-1', 'test-field-security-except-2']
                    },
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: [
                      'test-index-privilege-1',
                      'test-index-privilege-2',
                    ],
                    query: `{ "match": { "title": "foo" } }`,
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(
      `updates role which has existing other application privileges`,
      {
        name: 'foo-role',
        payload: {
          metadata: {
            foo: 'test-metadata',
          },
          elasticsearch: {
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
            run_as: ['test-run-as-1', 'test-run-as-2'],
          },
          kibana: {
            global: [
              'test-global-privilege-1',
              'test-global-privilege-2',
              'test-global-privilege-3'
            ],
          },
        },
        preCheckLicenseImpl: defaultPreCheckLicenseImpl,
        callWithRequestImpls: [
          async () => ({
            'foo-role': {
              metadata: {
                bar: 'old-metadata',
              },
              transient_metadata: {
                enabled: true,
              },
              cluster: ['old-cluster-privilege'],
              indices: [
                {
                  names: ['old-index-name'],
                  privileges: ['old-privilege'],
                },
              ],
              run_as: ['old-run-as'],
              applications: [
                {
                  application,
                  privileges: ['old-kibana-privilege'],
                  resources: ['old-resource'],
                },
                {
                  application: 'logstash-foo',
                  privileges: ['logstash-privilege'],
                  resources: ['logstash-resource'],
                },
                {
                  application: 'beats-foo',
                  privileges: ['beats-privilege'],
                  resources: ['beats-resource'],
                },
              ],
            },
          }),
          async () => { },
        ],
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
                        'test-global-privilege-1',
                        'test-global-privilege-2',
                        'test-global-privilege-3'
                      ],
                      resources: [GLOBAL_RESOURCE],
                    },
                    {
                      application: 'logstash-foo',
                      privileges: ['logstash-privilege'],
                      resources: ['logstash-resource'],
                    },
                    {
                      application: 'beats-foo',
                      privileges: ['beats-privilege'],
                      resources: ['beats-resource'],
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
                },
              },
            ],
          ],
          statusCode: 204,
          result: null,
        },
      }
    );
  });
});
