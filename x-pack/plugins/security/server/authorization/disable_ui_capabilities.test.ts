/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ElasticsearchFeature, KibanaFeature } from '@kbn/features-plugin/server';

import type { AuthenticatedUser } from '../../common/model';
import { Actions } from './actions';
import { disableUICapabilitiesFactory } from './disable_ui_capabilities';
import { authorizationMock } from './index.mock';
import type { CheckPrivilegesResponse } from './types';

type MockAuthzOptions =
  | { rejectCheckPrivileges: any }
  | {
      resolveCheckPrivileges: {
        privileges: CheckPrivilegesResponse['privileges'];
      };
    };

const actions = new Actions('1.0.0-zeta1');
const mockRequest = httpServerMock.createKibanaRequest();

const createMockAuthz = (options: MockAuthzOptions) => {
  const mock = authorizationMock.create({ version: '1.0.0-zeta1' });
  // plug actual ui actions into mock Actions with
  mock.actions = actions;

  mock.checkPrivilegesDynamicallyWithRequest.mockImplementation((request) => {
    expect(request).toBe(mockRequest);

    return jest.fn().mockImplementation((checkActions) => {
      if ('rejectCheckPrivileges' in options) {
        throw options.rejectCheckPrivileges;
      }

      const expectedKibana = options.resolveCheckPrivileges.privileges.kibana.map(
        (x) => x.privilege
      );
      const expectedCluster = (
        options.resolveCheckPrivileges.privileges.elasticsearch.cluster ?? []
      ).map((x) => x.privilege);

      expect(checkActions).toEqual({
        kibana: expectedKibana,
        elasticsearch: { cluster: expectedCluster, index: {} },
      });
      return options.resolveCheckPrivileges;
    });
  });
  mock.checkElasticsearchPrivilegesWithRequest.mockImplementation((request) => {
    expect(request).toBe(mockRequest);
    return jest.fn().mockImplementation((privileges) => {});
  });
  return mock;
};

const createMockUser = (user: Partial<AuthenticatedUser> = {}) =>
  ({
    username: 'mock_user',
    roles: [],
    ...user,
  } as AuthenticatedUser);

describe('usingPrivileges', () => {
  describe('checkPrivileges errors', () => {
    test(`disables uiCapabilities when a 401 is thrown`, async () => {
      const mockAuthz = createMockAuthz({
        rejectCheckPrivileges: { statusCode: 401, message: 'super informative message' },
      });
      const mockLoggers = loggingSystemMock.create();

      const { usingPrivileges } = disableUICapabilitiesFactory(
        mockRequest,
        [
          new KibanaFeature({
            id: 'fooFeature',
            name: 'Foo KibanaFeature',
            app: ['fooApp', 'foo'],
            category: { id: 'foo', label: 'foo' },
            privileges: null,
          }),
        ],
        [
          new ElasticsearchFeature({
            id: 'esFeature',
            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: [],
              },
            ],
          }),
        ],
        mockLoggers.get(),
        mockAuthz,
        createMockUser()
      );

      const result = await usingPrivileges(
        Object.freeze({
          navLinks: {
            foo: true,
            fooApp: true,
            bar: true,
          },
          management: {
            kibana: {
              indices: true,
            },
          },
          catalogue: {},
          fooFeature: {
            foo: true,
            bar: true,
          },
          barFeature: {
            foo: true,
            bar: true,
          },
        })
      );

      expect(result).toEqual({
        navLinks: {
          foo: false,
          fooApp: false,
          bar: true,
        },
        management: {
          kibana: {
            indices: false,
          },
        },
        catalogue: {},
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      });

      expect(loggingSystemMock.collect(mockLoggers).debug).toMatchInlineSnapshot(`
        Array [
          Array [
            "Disabling all uiCapabilities because we received a 401: super informative message",
          ],
        ]
      `);
    });

    test(`disables uiCapabilities when a 403 is thrown`, async () => {
      const mockAuthz = createMockAuthz({
        rejectCheckPrivileges: { statusCode: 403, message: 'even more super informative message' },
      });
      const mockLoggers = loggingSystemMock.create();

      const { usingPrivileges } = disableUICapabilitiesFactory(
        mockRequest,
        [
          new KibanaFeature({
            id: 'fooFeature',
            name: 'Foo KibanaFeature',
            app: ['foo'],
            category: { id: 'foo', label: 'foo' },
            privileges: null,
          }),
        ],
        [
          new ElasticsearchFeature({
            id: 'esFeature',
            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: [],
              },
            ],
          }),
        ],
        mockLoggers.get(),
        mockAuthz,
        createMockUser()
      );

      const result = await usingPrivileges(
        Object.freeze({
          navLinks: {
            foo: true,
            bar: true,
          },
          management: {
            kibana: {
              indices: true,
            },
          },
          catalogue: {},
          fooFeature: {
            foo: true,
            bar: true,
          },
          barFeature: {
            foo: true,
            bar: true,
          },
        })
      );

      expect(result).toEqual({
        navLinks: {
          foo: false,
          bar: true,
        },
        management: {
          kibana: {
            indices: false,
          },
        },
        catalogue: {},
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      });
      expect(loggingSystemMock.collect(mockLoggers).debug).toMatchInlineSnapshot(`
        Array [
          Array [
            "Disabling all uiCapabilities because we received a 403: even more super informative message",
          ],
        ]
      `);
    });

    test(`otherwise it throws the error`, async () => {
      const mockAuthz = createMockAuthz({
        rejectCheckPrivileges: new Error('something else entirely'),
      });
      const mockLoggers = loggingSystemMock.create();

      const { usingPrivileges } = disableUICapabilitiesFactory(
        mockRequest,
        [],
        [],
        mockLoggers.get(),
        mockAuthz,
        createMockUser()
      );

      await expect(
        usingPrivileges({
          navLinks: {
            foo: true,
            bar: false,
          },
          management: {
            kibana: {
              indices: true,
            },
          },
          catalogue: {},
        })
      ).rejects.toThrowErrorMatchingSnapshot();
      expect(loggingSystemMock.collect(mockLoggers)).toMatchInlineSnapshot(`
        Object {
          "debug": Array [],
          "error": Array [],
          "fatal": Array [],
          "info": Array [],
          "log": Array [],
          "trace": Array [],
          "warn": Array [],
        }
      `);
    });
  });

  test(`disables ui capabilities when they don't have privileges`, async () => {
    const mockAuthz = createMockAuthz({
      resolveCheckPrivileges: {
        privileges: {
          kibana: [
            { privilege: actions.ui.get('navLinks', 'foo'), authorized: true },
            { privilege: actions.ui.get('navLinks', 'bar'), authorized: false },
            { privilege: actions.ui.get('navLinks', 'quz'), authorized: false },
            { privilege: actions.ui.get('management', 'kibana', 'indices'), authorized: true },
            { privilege: actions.ui.get('management', 'kibana', 'settings'), authorized: false },
            {
              privilege: actions.ui.get('management', 'kibana', 'esManagement'),
              authorized: false,
            },
            { privilege: actions.ui.get('fooFeature', 'foo'), authorized: true },
            { privilege: actions.ui.get('fooFeature', 'bar'), authorized: false },
            { privilege: actions.ui.get('barFeature', 'foo'), authorized: true },
            { privilege: actions.ui.get('barFeature', 'bar'), authorized: false },
          ],
          elasticsearch: {
            cluster: [
              { privilege: 'manage', authorized: false },
              { privilege: 'monitor', authorized: true },
              { privilege: 'manage_security', authorized: true },
            ],
            index: {},
          },
        },
      },
    });

    const { usingPrivileges } = disableUICapabilitiesFactory(
      mockRequest,
      [
        new KibanaFeature({
          id: 'fooFeature',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: null,
        }),
        new KibanaFeature({
          id: 'barFeature',
          name: 'Bar KibanaFeature',
          app: ['bar'],
          category: { id: 'foo', label: 'foo' },
          privileges: null,
        }),
      ],
      [
        new ElasticsearchFeature({
          id: 'esFeature',
          privileges: [
            {
              requiredClusterPrivileges: ['manage'],
              ui: ['es_manage'],
            },
            {
              requiredClusterPrivileges: ['monitor'],
              ui: ['es_monitor'],
            },
          ],
        }),
        new ElasticsearchFeature({
          id: 'esSecurityFeature',
          privileges: [
            {
              requiredClusterPrivileges: ['manage_security'],
              ui: ['es_manage_sec'],
            },
          ],
        }),
        new ElasticsearchFeature({
          id: 'esManagementFeature',
          management: {
            kibana: ['esManagement'],
          },
          privileges: [
            {
              requiredClusterPrivileges: ['manage_security'],
              ui: [],
            },
          ],
        }),
      ],
      loggingSystemMock.create().get(),
      mockAuthz,
      createMockUser()
    );

    const result = await usingPrivileges(
      Object.freeze({
        navLinks: {
          foo: true,
          bar: true,
          quz: true,
        },
        management: {
          kibana: {
            indices: true,
            settings: false,
            esManagement: true,
          },
        },
        catalogue: {},
        fooFeature: {
          foo: true,
          bar: true,
        },
        barFeature: {
          foo: true,
          bar: true,
        },
        esFeature: {
          es_manage: true,
          es_monitor: true,
        },
        esSecurityFeature: {
          es_manage_sec: true,
        },
        esManagementFeature: {},
      })
    );

    expect(result).toEqual({
      navLinks: {
        foo: true,
        bar: false,
        quz: true,
      },
      management: {
        kibana: {
          indices: true,
          settings: false,
          esManagement: true,
        },
      },
      catalogue: {},
      fooFeature: {
        foo: true,
        bar: false,
      },
      barFeature: {
        foo: true,
        bar: false,
      },
      esFeature: {
        es_manage: false,
        es_monitor: true,
      },
      esSecurityFeature: {
        es_manage_sec: true,
      },
      esManagementFeature: {},
    });
  });

  test(`doesn't re-enable disabled uiCapabilities`, async () => {
    const mockAuthz = createMockAuthz({
      resolveCheckPrivileges: {
        privileges: {
          kibana: [
            { privilege: actions.ui.get('navLinks', 'foo'), authorized: true },
            { privilege: actions.ui.get('navLinks', 'bar'), authorized: true },
            { privilege: actions.ui.get('management', 'kibana', 'indices'), authorized: true },
            { privilege: actions.ui.get('fooFeature', 'foo'), authorized: true },
            { privilege: actions.ui.get('fooFeature', 'bar'), authorized: true },
            { privilege: actions.ui.get('barFeature', 'foo'), authorized: true },
            { privilege: actions.ui.get('barFeature', 'bar'), authorized: true },
          ],
          elasticsearch: {
            cluster: [],
            index: {},
          },
        },
      },
    });

    const { usingPrivileges } = disableUICapabilitiesFactory(
      mockRequest,
      [
        new KibanaFeature({
          id: 'fooFeature',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: null,
        }),
        new KibanaFeature({
          id: 'barFeature',
          name: 'Bar KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: null,
        }),
      ],
      [
        new ElasticsearchFeature({
          id: 'esFeature',
          privileges: [
            {
              requiredClusterPrivileges: [],
              ui: [],
            },
          ],
        }),
      ],
      loggingSystemMock.create().get(),
      mockAuthz,
      createMockUser()
    );

    const result = await usingPrivileges(
      Object.freeze({
        navLinks: {
          foo: false,
          bar: false,
        },
        management: {
          kibana: {
            indices: false,
          },
        },
        catalogue: {},
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      })
    );

    expect(result).toEqual({
      navLinks: {
        foo: false,
        bar: false,
      },
      management: {
        kibana: {
          indices: false,
        },
      },
      catalogue: {},
      fooFeature: {
        foo: false,
        bar: false,
      },
      barFeature: {
        foo: false,
        bar: false,
      },
    });
  });
});

describe('all', () => {
  test(`disables uiCapabilities`, () => {
    const mockAuthz = createMockAuthz({ rejectCheckPrivileges: new Error(`Don't use me`) });

    const { all } = disableUICapabilitiesFactory(
      mockRequest,
      [
        new KibanaFeature({
          id: 'fooFeature',
          name: 'Foo KibanaFeature',
          app: ['foo'],
          category: { id: 'foo', label: 'foo' },
          privileges: null,
        }),
      ],
      [
        new ElasticsearchFeature({
          id: 'esFeature',
          privileges: [
            {
              requiredClusterPrivileges: [],
              ui: ['bar'],
            },
          ],
        }),
      ],
      loggingSystemMock.create().get(),
      mockAuthz,
      createMockUser()
    );

    const result = all(
      Object.freeze({
        navLinks: {
          foo: true,
          bar: true,
        },
        management: {
          kibana: {
            indices: true,
          },
        },
        catalogue: {},
        fooFeature: {
          foo: true,
          bar: true,
        },
        barFeature: {
          foo: true,
          bar: true,
        },
        esFeature: {
          bar: true,
        },
      })
    );
    expect(result).toEqual({
      navLinks: {
        foo: false,
        bar: true,
      },
      management: {
        kibana: {
          indices: false,
        },
      },
      catalogue: {},
      fooFeature: {
        foo: false,
        bar: false,
      },
      barFeature: {
        foo: false,
        bar: false,
      },
      esFeature: {
        bar: false,
      },
    });
  });
});
