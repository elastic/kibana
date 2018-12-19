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
    all: [],
    read: [],
  },
  space: {
    all: [],
    read: [],
  },
  features: {
    foo: {
      'foo-privilege-1': [],
      'foo-privilege-2': [],
    },
    bar: {
      'bar-privilege-1': [],
      'bar-privilege-2': [],
    }
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
    const mockAuthorization = {
      privileges: {
        get: () => privilegeMap
      }
    };
    initPutRolesApi(
      mockServer,
      mockCallWithRequest,
      mockPreCheckLicense,
      mockAuthorization,
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

    describe('global', () => {
      putRoleTest(`only allows known Kibana global minimum privileges`, {
        name: 'foo-role',
        payload: {
          kibana: {
            global: {
              minimum: ["foo"]
            }
          }
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            //eslint-disable-next-line max-len
            message: `child \"kibana\" fails because [child \"global\" fails because [child \"minimum\" fails because [\"minimum\" at position 0 fails because [\"0\" must be one of [all, read]]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.global.minimum.0'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`only allows known Kibana global features`, {
        name: 'foo-role',
        payload: {
          kibana: {
            global: {
              feature: {
                baz: ['all']
              }
            }
          }
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            //eslint-disable-next-line max-len
            message: `child \"kibana\" fails because [child \"global\" fails because [child \"feature\" fails because [\"baz\" is not allowed]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.global.feature.baz'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`only allows known Kibana global feature privileges`, {
        name: 'foo-role',
        payload: {
          kibana: {
            global: {
              feature: {
                foo: ['foo-privilege-3']
              }
            }
          }
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            //eslint-disable-next-line max-len
            message: `child \"kibana\" fails because [child \"global\" fails because [child \"feature\" fails because [child \"foo\" fails because [\"foo\" at position 0 fails because [\"0\" must be one of [foo-privilege-1, foo-privilege-2]]]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.global.feature.foo.0'],
              source: 'payload',
            },
          },
        },
      });
    });

    describe('space', () => {
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

      putRoleTest(`only allows known Kibana space minimum privileges`, {
        name: 'foo-role',
        payload: {
          kibana: {
            space: {
              marketing: {
                minimum: ["foo"]
              }
            }
          }
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            //eslint-disable-next-line max-len
            message: `child \"kibana\" fails because [child \"space\" fails because [child \"marketing\" fails because [child \"minimum\" fails because [\"minimum\" at position 0 fails because [\"0\" must be one of [all, read]]]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.space.marketing.minimum.0'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`only allows known Kibana global features`, {
        name: 'foo-role',
        payload: {
          kibana: {
            space: {
              marketing: {
                feature: {
                  baz: ['all']
                }
              }
            }
          }
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            //eslint-disable-next-line max-len
            message: `child \"kibana\" fails because [child \"space\" fails because [child \"marketing\" fails because [child \"feature\" fails because [\"baz\" is not allowed]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.space.marketing.feature.baz'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`only allows known Kibana global feature privileges`, {
        name: 'foo-role',
        payload: {
          kibana: {
            space: {
              marketing: {
                feature: {
                  foo: ['foo-privilege-3']
                }
              }
            }
          }
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            //eslint-disable-next-line max-len
            message: `child \"kibana\" fails because [child \"space\" fails because [child \"marketing\" fails because [child \"feature\" fails because [child \"foo\" fails because [\"foo\" at position 0 fails because [\"0\" must be one of [foo-privilege-1, foo-privilege-2]]]]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.space.marketing.feature.foo.0'],
              source: 'payload',
            },
          },
        },
      });
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
          global: {
            minimum: ['all', 'read'],
            feature: {
              foo: ['foo-privilege-1', 'foo-privilege-2'],
              bar: ['bar-privilege-1', 'bar-privilege-2']
            }
          },
          space: {
            'test-space-1': {
              minimum: ['all', 'read'],
              feature: {
                bar: ['bar-privilege-1', 'bar-privilege-2']
              }
            },
            'test-space-2': {
              minimum: ['all', 'read'],
              feature: {
                foo: ['foo-privilege-1', 'foo-privilege-2'],
              }
            }
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
                      'all',
                      'read',
                      'feature_foo.foo-privilege-1',
                      'feature_foo.foo-privilege-2',
                      'feature_bar.bar-privilege-1',
                      'feature_bar.bar-privilege-2',
                    ],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: [
                      'space_all',
                      'space_read',
                      'feature_bar.bar-privilege-1',
                      'feature_bar.bar-privilege-2',
                    ],
                    resources: ['space:test-space-1']
                  },
                  {
                    application,
                    privileges: [
                      'space_all',
                      'space_read',
                      'feature_foo.foo-privilege-1',
                      'feature_foo.foo-privilege-2',
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
          global: {
            minimum: ['all'],
            feature: {
              foo: ['foo-privilege-1'],
              bar: ['bar-privilege-1']
            }
          },
          space: {
            'test-space-1': {
              minimum: ['all'],
              feature: {
                foo: ['foo-privilege-2']
              }
            },
            'test-space-2': {
              minimum: ['read'],
              feature: {
                bar: ['bar-privilege-2']
              }
            }
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
                      'all',
                      'feature_foo.foo-privilege-1',
                      'feature_bar.bar-privilege-1'
                    ],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: [
                      'space_all',
                      'feature_foo.foo-privilege-2'
                    ],
                    resources: ['space:test-space-1']
                  },
                  {
                    application,
                    privileges: [
                      'space_read',
                      'feature_bar.bar-privilege-2',
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
            global: {
              minimum: ['all', 'read']
            },
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
                        'all',
                        'read',
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
