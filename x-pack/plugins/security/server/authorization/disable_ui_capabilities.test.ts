/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ElasticsearchFeature, KibanaFeature } from '@kbn/features-plugin/server';
import type { CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';

import { Actions } from './actions';
import { disableUICapabilitiesFactory } from './disable_ui_capabilities';
import { authorizationMock } from './index.mock';
import type { AuthenticatedUser } from '../../common';

type MockAuthzOptions =
  | { rejectCheckPrivileges: any }
  | {
      resolveCheckPrivileges: {
        privileges: CheckPrivilegesResponse['privileges'];
      };
    };

const actions = new Actions();
const mockRequest = httpServerMock.createKibanaRequest();

const createMockAuthz = (options: MockAuthzOptions) => {
  const mock = authorizationMock.create();
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

const kibanaFeature1 = new KibanaFeature({
  id: 'kibanaFeature1',
  name: 'KibanaFeature1',
  app: ['app1'],
  category: { id: 'foo', label: 'foo' },
  privileges: {
    all: {
      app: ['foo'],
      catalogue: ['foo'],
      savedObject: {
        all: ['foo'],
        read: [],
      },
      ui: ['save', 'show'],
    },
    read: {
      app: ['foo'],
      catalogue: ['foo'],
      savedObject: {
        all: [],
        read: ['foo'],
      },
      ui: ['show'],
    },
  },
});

const kibanaFeature2 = new KibanaFeature({
  id: 'kibanaFeature2',
  name: 'KibanaFeature2',
  app: ['app1', 'app2'],
  category: { id: 'foo', label: 'foo' },
  privileges: {
    all: {
      app: ['foo'],
      catalogue: ['foo'],
      savedObject: {
        all: ['foo'],
        read: [],
      },
      ui: ['save', 'show'],
    },
    read: {
      app: ['foo'],
      catalogue: ['foo'],
      savedObject: {
        all: [],
        read: ['foo'],
      },
      ui: ['show'],
    },
  },
});

const optOutKibanaFeature = new KibanaFeature({
  id: 'optOutFeature',
  name: 'Feature that opts out of Kibana sec model',
  app: [],
  category: { id: 'optOut', label: 'optOut' },
  privileges: null,
});

const esManagementFeature = new ElasticsearchFeature({
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
});

describe('usingPrivileges', () => {
  describe('checkPrivileges errors', () => {
    const inputCapabilities = Object.freeze({
      navLinks: {
        app1: true,
        app2: true,
        app3: true,
      },
      management: {
        kibana: {
          indices: true,
        },
      },
      catalogue: {},
      kibanaFeature2: {
        foo: true,
        bar: true,
      },
      optOutFeature: {
        foo: true,
        bar: true,
      },
      esManagementFeature: {
        foo: true,
        bar: true,
      },
      unregisteredFeature: {
        foo: true,
        bar: true,
      },
    });

    const expectedDisabled = Object.freeze({
      navLinks: {
        app1: false,
        app2: false,
        app3: true, // will not diable unregistered app link
      },
      management: {
        kibana: {
          indices: false,
        },
      },
      catalogue: {},
      kibanaFeature2: {
        foo: false,
        bar: false,
      },
      optOutFeature: {
        // will not disbale features that opt out of Kibana security
        foo: true,
        bar: true,
      },
      esManagementFeature: {
        foo: false,
        bar: false,
      },
      unregisteredFeature: {
        // will not disble unregistered features
        foo: true,
        bar: true,
      },
    });

    test(`disables uiCapabilities when a 401 is thrown`, async () => {
      const mockAuthz = createMockAuthz({
        rejectCheckPrivileges: { statusCode: 401, message: 'super informative message' },
      });
      const mockLoggers = loggingSystemMock.create();

      const { usingPrivileges } = disableUICapabilitiesFactory(
        mockRequest,
        [kibanaFeature2, optOutKibanaFeature],
        [esManagementFeature],
        mockLoggers.get(),
        mockAuthz,
        createMockUser()
      );

      const result = await usingPrivileges(inputCapabilities);

      expect(result).toEqual(expectedDisabled);

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
        [kibanaFeature2, optOutKibanaFeature],
        [esManagementFeature],
        mockLoggers.get(),
        mockAuthz,
        createMockUser()
      );

      const result = await usingPrivileges(inputCapabilities);

      expect(result).toEqual(expectedDisabled);

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

  const esFeatures = [
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
  ];

  test(`disables ui capabilities when they don't have privileges`, async () => {
    // grant some privileges
    const mockAuthz = createMockAuthz({
      resolveCheckPrivileges: {
        privileges: {
          kibana: [
            { privilege: actions.ui.get('navLinks', 'app1'), authorized: true },
            { privilege: actions.ui.get('navLinks', 'app2'), authorized: false },
            { privilege: actions.ui.get('navLinks', 'app3'), authorized: false },
            { privilege: actions.ui.get('management', 'kibana', 'indices'), authorized: true },
            { privilege: actions.ui.get('management', 'kibana', 'settings'), authorized: false },
            {
              privilege: actions.ui.get('management', 'kibana', 'esManagement'),
              authorized: false,
            },
            { privilege: actions.ui.get('kibanaFeature1', 'foo'), authorized: true },
            { privilege: actions.ui.get('kibanaFeature1', 'bar'), authorized: false },
            { privilege: actions.ui.get('kibanaFeature2', 'foo'), authorized: true },
            { privilege: actions.ui.get('kibanaFeature2', 'bar'), authorized: false },
            { privilege: actions.ui.get('optOutFeature', 'foo'), authorized: false },
            { privilege: actions.ui.get('optOutFeature', 'bar'), authorized: false },
            { privilege: actions.ui.get('spaces', 'manage'), authorized: false },
            { privilege: actions.ui.get('globalSettings', 'show'), authorized: false },
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
      [kibanaFeature1, kibanaFeature2, optOutKibanaFeature],
      esFeatures,
      loggingSystemMock.create().get(),
      mockAuthz,
      createMockUser()
    );

    const result = await usingPrivileges(
      Object.freeze({
        navLinks: {
          app1: true,
          app2: true,
          app3: true,
        },
        management: {
          kibana: {
            indices: true,
            settings: false,
            esManagement: true,
          },
        },
        catalogue: {},
        kibanaFeature1: {
          foo: true,
          bar: true,
        },
        kibanaFeature2: {
          foo: true,
          bar: true,
        },
        optOutFeature: {
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
        spaces: {
          manage: true,
        },
        globalSettings: {
          show: true,
        },
      })
    );

    expect(result).toEqual({
      navLinks: {
        app1: true,
        app2: false,
        app3: true,
      },
      management: {
        kibana: {
          indices: true,
          settings: false,
          esManagement: true,
        },
      },
      catalogue: {},
      kibanaFeature1: {
        foo: true,
        bar: false,
      },
      kibanaFeature2: {
        foo: true,
        bar: false,
      },
      optOutFeature: {
        // these stay enabled because they opt out of Kibana security
        foo: true,
        bar: true,
      },
      esFeature: {
        es_manage: false,
        es_monitor: true,
      },
      esSecurityFeature: {
        es_manage_sec: true,
      },
      esManagementFeature: {},
      spaces: {
        manage: false,
      },
      globalSettings: {
        show: false,
      },
    });
  });

  test(`doesn't re-enable disabled uiCapabilities`, async () => {
    // grant all privileges
    const mockAuthz = createMockAuthz({
      resolveCheckPrivileges: {
        privileges: {
          kibana: [
            { privilege: actions.ui.get('navLinks', 'foo'), authorized: true },
            { privilege: actions.ui.get('navLinks', 'bar'), authorized: true },
            { privilege: actions.ui.get('management', 'kibana', 'indices'), authorized: true },
            { privilege: actions.ui.get('kibanaFeature1', 'foo'), authorized: true },
            { privilege: actions.ui.get('kibanaFeature1', 'bar'), authorized: true },
            { privilege: actions.ui.get('kibanaFeature2', 'foo'), authorized: true },
            { privilege: actions.ui.get('kibanaFeature2', 'bar'), authorized: true },
            { privilege: actions.ui.get('optOutFeature', 'foo'), authorized: true },
            { privilege: actions.ui.get('optOutFeature', 'bar'), authorized: true },
            { privilege: actions.ui.get('spaces', 'manage'), authorized: true },
            { privilege: actions.ui.get('globalSettings', 'show'), authorized: true },
          ],
          elasticsearch: {
            cluster: [
              { privilege: 'manage', authorized: true },
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
      [kibanaFeature1, kibanaFeature2, optOutKibanaFeature],
      esFeatures,
      loggingSystemMock.create().get(),
      mockAuthz,
      createMockUser()
    );

    const allFalseCapabilities = Object.freeze({
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
      kibanaFeature1: {
        foo: false,
        bar: false,
      },
      kibanaFeature2: {
        foo: false,
        bar: false,
      },
      optOutFeature: {
        foo: false,
        bar: false,
      },
      esFeature: {
        es_manage: false,
        es_monitor: false,
      },
      esSecurityFeature: {
        es_manage_sec: false,
      },
      esManagementFeature: {},
      spaces: {
        manage: false,
      },
      globalSettings: {
        show: false,
      },
    });
    const result = await usingPrivileges(allFalseCapabilities);

    expect(result).toEqual(allFalseCapabilities);
  });
});

describe('all', () => {
  test(`disables only registered uiCapabilities that do not opt out of kibana security`, () => {
    const mockAuthz = createMockAuthz({ rejectCheckPrivileges: new Error(`Don't use me`) });

    const { all } = disableUICapabilitiesFactory(
      mockRequest,
      [kibanaFeature1, optOutKibanaFeature],
      [
        new ElasticsearchFeature({
          id: 'esFeature1',
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
          app1: true,
          app2: true, // there is no app2 registered
        },
        management: {
          kibana: {
            indices: true,
          },
        },
        catalogue: {},
        kibanaFeature1: {
          foo: true,
          bar: true,
        },
        kibanaFeature2: {
          // there is no kibanaFeature2 registered
          foo: true,
          bar: true,
        },
        optOutFeature: {
          foo: true,
          bar: true,
        },
        esFeature1: {
          bar: true,
        },
        esFeature2: {
          bar: true,
        },
      })
    );
    expect(result).toEqual({
      navLinks: {
        app1: false,
        app2: true, // does NOT disable because it is not a registered navlink
      },
      management: {
        kibana: {
          indices: false, // nested values are always disabled
        },
      },
      catalogue: {},
      kibanaFeature1: {
        // registered kibana features with privileges get diabled
        foo: false,
        bar: false,
      },
      kibanaFeature2: {
        // does NOT disable because it is not a registered Kibana feature
        foo: true,
        bar: true,
      },
      optOutFeature: {
        // does NOT disable because it opts out (does not define privileges)
        foo: true,
        bar: true,
      },
      esFeature1: {
        // registered es features get diabled
        bar: false,
      },
      esFeature2: {
        // does NOT disable because it is not a registered ES feature
        bar: true,
      },
    });
  });
});
