/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { Feature } from '../../../../xpack_main/types';
import { Actions } from '../actions';
import { privilegesFactory } from './privileges';

const actions = new Actions('1.0.0-zeta1');

describe('features', () => {
  test('actions defined at the feature cascade to the privileges', () => {
    const features: Feature[] = [
      {
        id: 'foo-feature',
        name: 'Foo Feature',
        icon: 'arrowDown',
        navLinkId: 'kibana:foo',
        app: ['app-1', 'app-2'],
        catalogue: ['catalogue-1', 'catalogue-2'],
        management: {
          foo: ['management-1', 'management-2'],
        },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];

    const mockXPackMainPlugin = {
      getFeatures: jest.fn().mockReturnValue(features),
    };

    const privileges = privilegesFactory(actions, mockXPackMainPlugin);

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.foo-feature', {
      all: [
        actions.login,
        actions.version,
        'app:app-1',
        'app:app-2',
        'ui:catalogue/catalogue-1',
        'ui:catalogue/catalogue-2',
        'ui:management/foo/management-1',
        'ui:management/foo/management-2',
        'ui:navLinks/kibana:foo',
      ],
      read: [
        actions.login,
        actions.version,
        'app:app-1',
        'app:app-2',
        'ui:catalogue/catalogue-1',
        'ui:catalogue/catalogue-2',
        'ui:management/foo/management-1',
        'ui:management/foo/management-2',
        'ui:navLinks/kibana:foo',
      ],
    });
  });

  test('actions defined at the privilege take precedence', () => {
    const features: Feature[] = [
      {
        id: 'foo',
        name: 'Foo Feature',
        icon: 'arrowDown',
        app: ['ignore-me-1', 'ignore-me-2'],
        catalogue: ['ignore-me-1', 'ignore-me-2'],
        management: {
          foo: ['ignore-me-1', 'ignore-me-2'],
        },
        privileges: {
          all: {
            app: ['all-app-1', 'all-app-2'],
            catalogue: ['catalogue-all-1', 'catalogue-all-2'],
            management: {
              all: ['all-management-1', 'all-management-2'],
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          read: {
            app: ['read-app-1', 'read-app-2'],
            catalogue: ['catalogue-read-1', 'catalogue-read-2'],
            management: {
              read: ['read-management-1', 'read-management-2'],
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];

    const mockXPackMainPlugin = {
      getFeatures: jest.fn().mockReturnValue(features),
    };

    const privileges = privilegesFactory(actions, mockXPackMainPlugin);

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.foo', {
      all: [
        actions.login,
        actions.version,
        'app:all-app-1',
        'app:all-app-2',
        'ui:catalogue/catalogue-all-1',
        'ui:catalogue/catalogue-all-2',
        'ui:management/all/all-management-1',
        'ui:management/all/all-management-2',
      ],
      read: [
        actions.login,
        actions.version,
        'app:read-app-1',
        'app:read-app-2',
        'ui:catalogue/catalogue-read-1',
        'ui:catalogue/catalogue-read-2',
        'ui:management/read/read-management-1',
        'ui:management/read/read-management-2',
      ],
    });
  });

  test(`actions only specified at the privilege are alright too`, () => {
    const features: Feature[] = [
      {
        id: 'foo',
        name: 'Foo Feature',
        icon: 'arrowDown',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: ['all-savedObject-all-1', 'all-savedObject-all-2'],
              read: ['all-savedObject-read-1', 'all-savedObject-read-2'],
            },
            ui: ['all-ui-1', 'all-ui-2'],
          },
          read: {
            savedObject: {
              all: ['read-savedObject-all-1', 'read-savedObject-all-2'],
              read: ['read-savedObject-read-1', 'read-savedObject-read-2'],
            },
            ui: ['read-ui-1', 'read-ui-2'],
          },
        },
      },
    ];

    const mockXPackMainPlugin = {
      getFeatures: jest.fn().mockReturnValue(features),
    };

    const privileges = privilegesFactory(actions, mockXPackMainPlugin);

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.foo', {
      all: [
        actions.login,
        actions.version,
        'saved_object:all-savedObject-all-1/bulk_get',
        'saved_object:all-savedObject-all-1/get',
        'saved_object:all-savedObject-all-1/find',
        'saved_object:all-savedObject-all-1/create',
        'saved_object:all-savedObject-all-1/bulk_create',
        'saved_object:all-savedObject-all-1/update',
        'saved_object:all-savedObject-all-1/delete',
        'saved_object:all-savedObject-all-2/bulk_get',
        'saved_object:all-savedObject-all-2/get',
        'saved_object:all-savedObject-all-2/find',
        'saved_object:all-savedObject-all-2/create',
        'saved_object:all-savedObject-all-2/bulk_create',
        'saved_object:all-savedObject-all-2/update',
        'saved_object:all-savedObject-all-2/delete',
        'saved_object:all-savedObject-read-1/bulk_get',
        'saved_object:all-savedObject-read-1/get',
        'saved_object:all-savedObject-read-1/find',
        'saved_object:all-savedObject-read-2/bulk_get',
        'saved_object:all-savedObject-read-2/get',
        'saved_object:all-savedObject-read-2/find',
        'ui:foo/all-ui-1',
        'ui:foo/all-ui-2',
      ],
      read: [
        actions.login,
        actions.version,
        'saved_object:read-savedObject-all-1/bulk_get',
        'saved_object:read-savedObject-all-1/get',
        'saved_object:read-savedObject-all-1/find',
        'saved_object:read-savedObject-all-1/create',
        'saved_object:read-savedObject-all-1/bulk_create',
        'saved_object:read-savedObject-all-1/update',
        'saved_object:read-savedObject-all-1/delete',
        'saved_object:read-savedObject-all-2/bulk_get',
        'saved_object:read-savedObject-all-2/get',
        'saved_object:read-savedObject-all-2/find',
        'saved_object:read-savedObject-all-2/create',
        'saved_object:read-savedObject-all-2/bulk_create',
        'saved_object:read-savedObject-all-2/update',
        'saved_object:read-savedObject-all-2/delete',
        'saved_object:read-savedObject-read-1/bulk_get',
        'saved_object:read-savedObject-read-1/get',
        'saved_object:read-savedObject-read-1/find',
        'saved_object:read-savedObject-read-2/bulk_get',
        'saved_object:read-savedObject-read-2/get',
        'saved_object:read-savedObject-read-2/find',
        'ui:foo/read-ui-1',
        'ui:foo/read-ui-2',
      ],
    });
  });
});

// the `global` and `space` privileges behave very similarly, with the one exception being that
// "global all" includes the ability to manage spaces. The following tests both groups at once...
[
  {
    group: 'global',
    expectManageSpaces: true,
  },
  {
    group: 'space',
    expectManageSpaces: false,
  },
].forEach(({ group, expectManageSpaces }) => {
  describe(group, () => {
    test('actions defined only at the feature are included in `all` and `read`', () => {
      const features: Feature[] = [
        {
          id: 'foo',
          name: 'Foo Feature',
          icon: 'arrowDown',
          navLinkId: 'kibana:foo',
          app: ['app-1', 'app-2'],
          catalogue: ['catalogue-1', 'catalogue-2'],
          management: {
            foo: ['management-1', 'management-2'],
          },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
          },
        },
      ];

      const mockXPackMainPlugin = {
        getFeatures: jest.fn().mockReturnValue(features),
      };

      const privileges = privilegesFactory(actions, mockXPackMainPlugin);

      const actual = privileges.get();
      expect(actual).toHaveProperty(group, {
        all: [
          actions.login,
          actions.version,
          ...(expectManageSpaces ? ['space:manage'] : []),
          'app:app-1',
          'app:app-2',
          'ui:catalogue/catalogue-1',
          'ui:catalogue/catalogue-2',
          'ui:management/foo/management-1',
          'ui:management/foo/management-2',
          'ui:navLinks/kibana:foo',
        ],
        read: [
          actions.login,
          actions.version,
          'app:app-1',
          'app:app-2',
          'ui:catalogue/catalogue-1',
          'ui:catalogue/catalogue-2',
          'ui:management/foo/management-1',
          'ui:management/foo/management-2',
          'ui:navLinks/kibana:foo',
        ],
      });
    });

    test('actions defined in any feature privilege are included in `all`', () => {
      const features: Feature[] = [
        {
          id: 'foo',
          name: 'Foo Feature',
          icon: 'arrowDown',
          navLinkId: 'kibana:foo',
          app: [],
          catalogue: ['ignore-me-1', 'ignore-me-2'],
          management: {
            foo: ['ignore-me-1', 'ignore-me-2'],
          },
          privileges: {
            bar: {
              management: {
                'bar-management': ['bar-management-1', 'bar-management-2'],
              },
              catalogue: ['bar-catalogue-1', 'bar-catalogue-2'],
              savedObject: {
                all: ['bar-savedObject-all-1', 'bar-savedObject-all-2'],
                read: ['bar-savedObject-read-1', 'bar-savedObject-read-2'],
              },
              ui: ['bar-ui-1', 'bar-ui-2'],
            },
            all: {
              management: {
                'all-management': ['all-management-1', 'all-management-2'],
              },
              catalogue: ['all-catalogue-1', 'all-catalogue-2'],
              savedObject: {
                all: ['all-savedObject-all-1', 'all-savedObject-all-2'],
                read: ['all-savedObject-read-1', 'all-savedObject-read-2'],
              },
              ui: ['all-ui-1', 'all-ui-2'],
            },
            read: {
              management: {
                'read-management': ['read-management-1', 'read-management-2'],
              },
              catalogue: ['read-catalogue-1', 'read-catalogue-2'],
              savedObject: {
                all: ['read-savedObject-all-1', 'read-savedObject-all-2'],
                read: ['read-savedObject-read-1', 'read-savedObject-read-2'],
              },
              ui: ['read-ui-1', 'read-ui-2'],
            },
          },
        },
      ];

      const mockXPackMainPlugin = {
        getFeatures: jest.fn().mockReturnValue(features),
      };

      const privileges = privilegesFactory(actions, mockXPackMainPlugin);

      const actual = privileges.get();
      expect(actual).toHaveProperty(`${group}.all`, [
        actions.login,
        actions.version,
        ...(expectManageSpaces ? ['space:manage'] : []),
        'saved_object:bar-savedObject-all-1/bulk_get',
        'saved_object:bar-savedObject-all-1/get',
        'saved_object:bar-savedObject-all-1/find',
        'saved_object:bar-savedObject-all-1/create',
        'saved_object:bar-savedObject-all-1/bulk_create',
        'saved_object:bar-savedObject-all-1/update',
        'saved_object:bar-savedObject-all-1/delete',
        'saved_object:bar-savedObject-all-2/bulk_get',
        'saved_object:bar-savedObject-all-2/get',
        'saved_object:bar-savedObject-all-2/find',
        'saved_object:bar-savedObject-all-2/create',
        'saved_object:bar-savedObject-all-2/bulk_create',
        'saved_object:bar-savedObject-all-2/update',
        'saved_object:bar-savedObject-all-2/delete',
        'saved_object:bar-savedObject-read-1/bulk_get',
        'saved_object:bar-savedObject-read-1/get',
        'saved_object:bar-savedObject-read-1/find',
        'saved_object:bar-savedObject-read-2/bulk_get',
        'saved_object:bar-savedObject-read-2/get',
        'saved_object:bar-savedObject-read-2/find',
        'ui:catalogue/bar-catalogue-1',
        'ui:catalogue/bar-catalogue-2',
        'ui:management/bar-management/bar-management-1',
        'ui:management/bar-management/bar-management-2',
        'ui:navLinks/kibana:foo',
        'ui:foo/bar-ui-1',
        'ui:foo/bar-ui-2',
        'saved_object:all-savedObject-all-1/bulk_get',
        'saved_object:all-savedObject-all-1/get',
        'saved_object:all-savedObject-all-1/find',
        'saved_object:all-savedObject-all-1/create',
        'saved_object:all-savedObject-all-1/bulk_create',
        'saved_object:all-savedObject-all-1/update',
        'saved_object:all-savedObject-all-1/delete',
        'saved_object:all-savedObject-all-2/bulk_get',
        'saved_object:all-savedObject-all-2/get',
        'saved_object:all-savedObject-all-2/find',
        'saved_object:all-savedObject-all-2/create',
        'saved_object:all-savedObject-all-2/bulk_create',
        'saved_object:all-savedObject-all-2/update',
        'saved_object:all-savedObject-all-2/delete',
        'saved_object:all-savedObject-read-1/bulk_get',
        'saved_object:all-savedObject-read-1/get',
        'saved_object:all-savedObject-read-1/find',
        'saved_object:all-savedObject-read-2/bulk_get',
        'saved_object:all-savedObject-read-2/get',
        'saved_object:all-savedObject-read-2/find',
        'ui:catalogue/all-catalogue-1',
        'ui:catalogue/all-catalogue-2',
        'ui:management/all-management/all-management-1',
        'ui:management/all-management/all-management-2',
        'ui:foo/all-ui-1',
        'ui:foo/all-ui-2',
        'saved_object:read-savedObject-all-1/bulk_get',
        'saved_object:read-savedObject-all-1/get',
        'saved_object:read-savedObject-all-1/find',
        'saved_object:read-savedObject-all-1/create',
        'saved_object:read-savedObject-all-1/bulk_create',
        'saved_object:read-savedObject-all-1/update',
        'saved_object:read-savedObject-all-1/delete',
        'saved_object:read-savedObject-all-2/bulk_get',
        'saved_object:read-savedObject-all-2/get',
        'saved_object:read-savedObject-all-2/find',
        'saved_object:read-savedObject-all-2/create',
        'saved_object:read-savedObject-all-2/bulk_create',
        'saved_object:read-savedObject-all-2/update',
        'saved_object:read-savedObject-all-2/delete',
        'saved_object:read-savedObject-read-1/bulk_get',
        'saved_object:read-savedObject-read-1/get',
        'saved_object:read-savedObject-read-1/find',
        'saved_object:read-savedObject-read-2/bulk_get',
        'saved_object:read-savedObject-read-2/get',
        'saved_object:read-savedObject-read-2/find',
        'ui:catalogue/read-catalogue-1',
        'ui:catalogue/read-catalogue-2',
        'ui:management/read-management/read-management-1',
        'ui:management/read-management/read-management-2',
        'ui:foo/read-ui-1',
        'ui:foo/read-ui-2',
      ]);
    });

    test('actions defined in a feature privilege with name `read` are included in `read`', () => {
      const features: Feature[] = [
        {
          id: 'foo',
          name: 'Foo Feature',
          icon: 'arrowDown',
          navLinkId: 'kibana:foo',
          app: [],
          catalogue: ['ignore-me-1', 'ignore-me-2'],
          management: {
            foo: ['ignore-me-1', 'ignore-me-2'],
          },
          privileges: {
            bar: {
              management: {
                'ignore-me': ['ignore-me-1', 'ignore-me-2'],
              },
              catalogue: ['ignore-me-1', 'ignore-me-2'],
              savedObject: {
                all: ['ignore-me-1', 'ignore-me-2'],
                read: ['ignore-me-1', 'ignore-me-2'],
              },
              ui: ['ignore-me-1', 'ignore-me-2'],
            },
            all: {
              management: {
                'ignore-me': ['ignore-me-1', 'ignore-me-2'],
              },
              catalogue: ['ignore-me-1', 'ignore-me-2'],
              savedObject: {
                all: ['ignore-me-1', 'ignore-me-2'],
                read: ['ignore-me-1', 'ignore-me-2'],
              },
              ui: ['ignore-me-1', 'ignore-me-2'],
            },
            read: {
              management: {
                'read-management': ['read-management-1', 'read-management-2'],
              },
              catalogue: ['read-catalogue-1', 'read-catalogue-2'],
              savedObject: {
                all: ['read-savedObject-all-1', 'read-savedObject-all-2'],
                read: ['read-savedObject-read-1', 'read-savedObject-read-2'],
              },
              ui: ['read-ui-1', 'read-ui-2'],
            },
          },
        },
      ];

      const mockXPackMainPlugin = {
        getFeatures: jest.fn().mockReturnValue(features),
      };

      const privileges = privilegesFactory(actions, mockXPackMainPlugin);

      const actual = privileges.get();
      expect(actual).toHaveProperty(`${group}.read`, [
        actions.login,
        actions.version,
        'saved_object:read-savedObject-all-1/bulk_get',
        'saved_object:read-savedObject-all-1/get',
        'saved_object:read-savedObject-all-1/find',
        'saved_object:read-savedObject-all-1/create',
        'saved_object:read-savedObject-all-1/bulk_create',
        'saved_object:read-savedObject-all-1/update',
        'saved_object:read-savedObject-all-1/delete',
        'saved_object:read-savedObject-all-2/bulk_get',
        'saved_object:read-savedObject-all-2/get',
        'saved_object:read-savedObject-all-2/find',
        'saved_object:read-savedObject-all-2/create',
        'saved_object:read-savedObject-all-2/bulk_create',
        'saved_object:read-savedObject-all-2/update',
        'saved_object:read-savedObject-all-2/delete',
        'saved_object:read-savedObject-read-1/bulk_get',
        'saved_object:read-savedObject-read-1/get',
        'saved_object:read-savedObject-read-1/find',
        'saved_object:read-savedObject-read-2/bulk_get',
        'saved_object:read-savedObject-read-2/get',
        'saved_object:read-savedObject-read-2/find',
        'ui:catalogue/read-catalogue-1',
        'ui:catalogue/read-catalogue-2',
        'ui:management/read-management/read-management-1',
        'ui:management/read-management/read-management-2',
        'ui:navLinks/kibana:foo',
        'ui:foo/read-ui-1',
        'ui:foo/read-ui-2',
      ]);
    });

    test('actions defined in a feature privilege with `includeInBaseRead` are included in `read`', () => {
      const features: Feature[] = [
        {
          id: 'foo',
          name: 'Foo Feature',
          icon: 'arrowDown',
          navLinkId: 'kibana:foo',
          app: [],
          catalogue: ['ignore-me-1', 'ignore-me-2'],
          management: {
            foo: ['ignore-me-1', 'ignore-me-2'],
          },
          privileges: {
            all: {
              management: {
                'ignore-me': ['ignore-me-1', 'ignore-me-2'],
              },
              catalogue: ['ignore-me-1', 'ignore-me-2'],
              savedObject: {
                all: ['ignore-me-1', 'ignore-me-2'],
                read: ['ignore-me-1', 'ignore-me-2'],
              },
              ui: ['ignore-me-1', 'ignore-me-2'],
            },
            bar: {
              grantWithBaseRead: true,
              management: {
                'read-management': ['read-management-1', 'read-management-2'],
              },
              catalogue: ['read-catalogue-1', 'read-catalogue-2'],
              savedObject: {
                all: ['read-savedObject-all-1', 'read-savedObject-all-2'],
                read: ['read-savedObject-read-1', 'read-savedObject-read-2'],
              },
              ui: ['read-ui-1', 'read-ui-2'],
            },
          },
        },
      ];

      const mockXPackMainPlugin = {
        getFeatures: jest.fn().mockReturnValue(features),
      };

      const privileges = privilegesFactory(actions, mockXPackMainPlugin);

      const actual = privileges.get();
      expect(actual).toHaveProperty(`${group}.read`, [
        actions.login,
        actions.version,
        'saved_object:read-savedObject-all-1/bulk_get',
        'saved_object:read-savedObject-all-1/get',
        'saved_object:read-savedObject-all-1/find',
        'saved_object:read-savedObject-all-1/create',
        'saved_object:read-savedObject-all-1/bulk_create',
        'saved_object:read-savedObject-all-1/update',
        'saved_object:read-savedObject-all-1/delete',
        'saved_object:read-savedObject-all-2/bulk_get',
        'saved_object:read-savedObject-all-2/get',
        'saved_object:read-savedObject-all-2/find',
        'saved_object:read-savedObject-all-2/create',
        'saved_object:read-savedObject-all-2/bulk_create',
        'saved_object:read-savedObject-all-2/update',
        'saved_object:read-savedObject-all-2/delete',
        'saved_object:read-savedObject-read-1/bulk_get',
        'saved_object:read-savedObject-read-1/get',
        'saved_object:read-savedObject-read-1/find',
        'saved_object:read-savedObject-read-2/bulk_get',
        'saved_object:read-savedObject-read-2/get',
        'saved_object:read-savedObject-read-2/find',
        'ui:catalogue/read-catalogue-1',
        'ui:catalogue/read-catalogue-2',
        'ui:management/read-management/read-management-1',
        'ui:management/read-management/read-management-2',
        'ui:navLinks/kibana:foo',
        'ui:foo/read-ui-1',
        'ui:foo/read-ui-2',
      ]);
    });
  });
});
