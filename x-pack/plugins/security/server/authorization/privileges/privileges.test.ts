/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFeature } from '@kbn/features-plugin/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { licenseMock } from '../../../common/licensing/index.mock';
import { Actions } from '../actions';
import { privilegesFactory } from './privileges';

const actions = new Actions('1.0.0-zeta1');

const mockLicenseServiceBasic = licenseMock.create({ allowSubFeaturePrivileges: false }, 'basic');
const mockLicenseServiceGold = licenseMock.create({ allowSubFeaturePrivileges: true }, 'gold');
const mockLicenseServicePlatinum = licenseMock.create(
  { allowSubFeaturePrivileges: true },
  'platinum'
);

describe('features', () => {
  test('actions defined at the feature do not cascade to the privileges', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo-feature',
        name: 'Foo KibanaFeature',
        app: ['app-1', 'app-2'],
        category: { id: 'foo', label: 'foo' },
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
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);

    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.foo-feature', {
      all: [actions.login, actions.version],
      read: [actions.login, actions.version],
      minimal_all: [actions.login, actions.version],
      minimal_read: [actions.login, actions.version],
    });
  });

  test(`actions only specified at the privilege are alright too`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
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
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const expectedAllPrivileges = [
      actions.login,
      actions.version,
      actions.savedObject.get('all-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-1', 'get'),
      actions.savedObject.get('all-savedObject-all-1', 'find'),
      actions.savedObject.get('all-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'create'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-1', 'update'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-1', 'delete'),
      actions.savedObject.get('all-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-2', 'get'),
      actions.savedObject.get('all-savedObject-all-2', 'find'),
      actions.savedObject.get('all-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'create'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-2', 'update'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-2', 'delete'),
      actions.savedObject.get('all-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('all-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-1', 'get'),
      actions.savedObject.get('all-savedObject-read-1', 'find'),
      actions.savedObject.get('all-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-1', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-2', 'get'),
      actions.savedObject.get('all-savedObject-read-2', 'find'),
      actions.savedObject.get('all-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('foo', 'all-ui-1'),
      actions.ui.get('foo', 'all-ui-2'),
    ];

    const expectedReadPrivileges = [
      actions.login,
      actions.version,
      actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-1', 'get'),
      actions.savedObject.get('read-savedObject-all-1', 'find'),
      actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'create'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-1', 'update'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-1', 'delete'),
      actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-2', 'get'),
      actions.savedObject.get('read-savedObject-all-2', 'find'),
      actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'create'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-2', 'update'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-2', 'delete'),
      actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-1', 'get'),
      actions.savedObject.get('read-savedObject-read-1', 'find'),
      actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-2', 'get'),
      actions.savedObject.get('read-savedObject-read-2', 'find'),
      actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('foo', 'read-ui-1'),
      actions.ui.get('foo', 'read-ui-2'),
    ];

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.foo', {
      all: [...expectedAllPrivileges],
      read: [...expectedReadPrivileges],
      minimal_all: [...expectedAllPrivileges],
      minimal_read: [...expectedReadPrivileges],
    });
  });

  test(`features with no privileges aren't listed`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).not.toHaveProperty('features.foo');
  });
});

// the `global` and `space` privileges behave very similarly, with the one exception being that
// "global all" includes the ability to manage spaces. The following tests both groups at once...
[
  {
    group: 'global',
    expectManageSpaces: true,
    expectGetFeatures: true,
    expectEnterpriseSearch: true,
    expectDecryptedTelemetry: true,
  },
  {
    group: 'space',
    expectManageSpaces: false,
    expectGetFeatures: false,
    expectEnterpriseSearch: false,
    expectDecryptedTelemetry: false,
  },
].forEach(
  ({
    group,
    expectManageSpaces,
    expectGetFeatures,
    expectEnterpriseSearch,
    expectDecryptedTelemetry,
  }) => {
    describe(`${group}`, () => {
      test('actions defined in any feature privilege are included in `all`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: {
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
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
          ...(expectGetFeatures ? [actions.api.get('features')] : []),
          ...(expectGetFeatures ? [actions.api.get('taskManager')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          actions.ui.get('catalogue', 'all-catalogue-1'),
          actions.ui.get('catalogue', 'all-catalogue-2'),
          actions.ui.get('management', 'all-management', 'all-management-1'),
          actions.ui.get('management', 'all-management', 'all-management-2'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('all-savedObject-all-1', 'get'),
          actions.savedObject.get('all-savedObject-all-1', 'find'),
          actions.savedObject.get('all-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-all-1', 'create'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('all-savedObject-all-1', 'update'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('all-savedObject-all-1', 'delete'),
          actions.savedObject.get('all-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('all-savedObject-all-2', 'get'),
          actions.savedObject.get('all-savedObject-all-2', 'find'),
          actions.savedObject.get('all-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-all-2', 'create'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('all-savedObject-all-2', 'update'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('all-savedObject-all-2', 'delete'),
          actions.savedObject.get('all-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('all-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('all-savedObject-read-1', 'get'),
          actions.savedObject.get('all-savedObject-read-1', 'find'),
          actions.savedObject.get('all-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-read-1', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('all-savedObject-read-2', 'get'),
          actions.savedObject.get('all-savedObject-read-2', 'find'),
          actions.savedObject.get('all-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('foo', 'all-ui-1'),
          actions.ui.get('foo', 'all-ui-2'),
          actions.ui.get('catalogue', 'read-catalogue-1'),
          actions.ui.get('catalogue', 'read-catalogue-2'),
          actions.ui.get('management', 'read-management', 'read-management-1'),
          actions.ui.get('management', 'read-management', 'read-management-2'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-1', 'get'),
          actions.savedObject.get('read-savedObject-all-1', 'find'),
          actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'create'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-1', 'update'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-1', 'delete'),
          actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-2', 'get'),
          actions.savedObject.get('read-savedObject-all-2', 'find'),
          actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'create'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-2', 'update'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-2', 'delete'),
          actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-1', 'get'),
          actions.savedObject.get('read-savedObject-read-1', 'find'),
          actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-2', 'get'),
          actions.savedObject.get('read-savedObject-read-2', 'find'),
          actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('foo', 'read-ui-1'),
          actions.ui.get('foo', 'read-ui-2'),
        ]);
      });

      test('actions defined in a feature privilege with name `read` are included in `read`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
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
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
          actions.ui.get('catalogue', 'read-catalogue-1'),
          actions.ui.get('catalogue', 'read-catalogue-2'),
          actions.ui.get('management', 'read-management', 'read-management-1'),
          actions.ui.get('management', 'read-management', 'read-management-2'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-1', 'get'),
          actions.savedObject.get('read-savedObject-all-1', 'find'),
          actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'create'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-1', 'update'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-1', 'delete'),
          actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-2', 'get'),
          actions.savedObject.get('read-savedObject-all-2', 'find'),
          actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'create'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-2', 'update'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-2', 'delete'),
          actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-1', 'get'),
          actions.savedObject.get('read-savedObject-read-1', 'find'),
          actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-2', 'get'),
          actions.savedObject.get('read-savedObject-read-2', 'find'),
          actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('foo', 'read-ui-1'),
          actions.ui.get('foo', 'read-ui-2'),
        ]);
      });

      test('actions defined in a reserved privilege are not included in `all` or `read`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: null,
            reserved: {
              privileges: [
                {
                  id: 'reserved',
                  privilege: {
                    savedObject: {
                      all: ['ignore-me-1', 'ignore-me-2'],
                      read: ['ignore-me-1', 'ignore-me-2'],
                    },
                    ui: ['ignore-me-1'],
                  },
                },
              ],
              description: '',
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
          ...(expectGetFeatures ? [actions.api.get('features')] : []),
          ...(expectGetFeatures ? [actions.api.get('taskManager')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
        ]);
      });

      test('actions defined in a feature with excludeFromBasePrivileges are not included in `all` or `read', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            excludeFromBasePrivileges: true,
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
          ...(expectGetFeatures ? [actions.api.get('features')] : []),
          ...(expectGetFeatures ? [actions.api.get('taskManager')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
        ]);
      });

      test('actions defined in an individual feature privilege with excludeFromBasePrivileges are not included in `all` or `read`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: {
              all: {
                excludeFromBasePrivileges: true,
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                excludeFromBasePrivileges: true,
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
          ...(expectGetFeatures ? [actions.api.get('features')] : []),
          ...(expectGetFeatures ? [actions.api.get('taskManager')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          actions.version,
          ...(expectDecryptedTelemetry ? [actions.api.get('decryptedTelemetry')] : []),
        ]);
      });
    });
  }
);

describe('reserved', () => {
  test('actions defined at the feature do not cascade to the privileges', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: ['app-1', 'app-2'],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['catalogue-1', 'catalogue-2'],
        management: {
          foo: ['management-1', 'management-2'],
        },
        privileges: null,
        reserved: {
          privileges: [
            {
              id: 'foo',
              privilege: {
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
              },
            },
          ],
          description: '',
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).toHaveProperty('reserved.foo', [actions.version]);
  });

  test(`actions only specified at the privilege are alright too`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        reserved: {
          privileges: [
            {
              id: 'foo',
              privilege: {
                savedObject: {
                  all: ['savedObject-all-1', 'savedObject-all-2'],
                  read: ['savedObject-read-1', 'savedObject-read-2'],
                },
                ui: ['ui-1', 'ui-2'],
              },
            },
          ],
          description: '',
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).toHaveProperty('reserved.foo', [
      actions.version,
      actions.savedObject.get('savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('savedObject-all-1', 'get'),
      actions.savedObject.get('savedObject-all-1', 'find'),
      actions.savedObject.get('savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('savedObject-all-1', 'create'),
      actions.savedObject.get('savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('savedObject-all-1', 'update'),
      actions.savedObject.get('savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('savedObject-all-1', 'delete'),
      actions.savedObject.get('savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('savedObject-all-2', 'get'),
      actions.savedObject.get('savedObject-all-2', 'find'),
      actions.savedObject.get('savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('savedObject-all-2', 'create'),
      actions.savedObject.get('savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('savedObject-all-2', 'update'),
      actions.savedObject.get('savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('savedObject-all-2', 'delete'),
      actions.savedObject.get('savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('savedObject-read-1', 'get'),
      actions.savedObject.get('savedObject-read-1', 'find'),
      actions.savedObject.get('savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('savedObject-read-1', 'close_point_in_time'),
      actions.savedObject.get('savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('savedObject-read-2', 'get'),
      actions.savedObject.get('savedObject-read-2', 'find'),
      actions.savedObject.get('savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('foo', 'ui-1'),
      actions.ui.get('foo', 'ui-2'),
    ]);
  });

  test(`features with no reservedPrivileges aren't listed`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['foo'],
          },
          read: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['foo'],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).not.toHaveProperty('reserved.foo');
  });
});

describe('subFeatures', () => {
  describe(`with includeIn: 'none'`, () => {
    test(`should not augment the primary feature privileges, base privileges, or minimal feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'none',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty('foo.all', [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);
      expect(actual.features).toHaveProperty('foo.minimal_all', [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty('foo.read', [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);
      expect(actual.features).toHaveProperty('foo.minimal_read', [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('foo', 'foo'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);
    });
  });

  describe(`with includeIn: 'read'`, () => {
    test(`should augment the primary feature privileges and base privileges, but never the minimal versions`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
    });

    test(`should augment the primary feature privileges, but not base privileges if feature is excluded from them.`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          excludeFromBasePrivileges: true,
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
      ]);

      expect(actual).toHaveProperty('space.all', [actions.login, actions.version]);
      expect(actual).toHaveProperty('space.read', [actions.login, actions.version]);
    });
  });

  describe(`with includeIn: 'all'`, () => {
    test(`should augment the primary 'all' feature privileges and base 'all' privileges, but never the minimal versions`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'all',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);
    });

    test(`should augment the primary 'all' feature privileges, but not the base privileges if the feature is excluded from them`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          excludeFromBasePrivileges: true,
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'all',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
      ]);

      expect(actual).toHaveProperty('space.all', [actions.login, actions.version]);
      expect(actual).toHaveProperty('space.read', [actions.login, actions.version]);
    });
  });

  describe(`when license does not allow sub features`, () => {
    test(`should augment the primary feature privileges, and should not create sub-feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

      const actual = privileges.get();
      expect(actual.features).not.toHaveProperty(`foo.subFeaturePriv1`);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
    });
  });

  describe(`when license allows subfeatures, but not a specific sub feature`, () => {
    test(`should create minimal privileges, but not augment the primary feature privileges or create the disallowed sub-feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'licensedSubFeaturePriv',
                      name: 'licensed sub feature priv',
                      includeIn: 'read',
                      minimumLicense: 'platinum',
                      savedObject: {
                        all: ['all-licensed-sub-feature-type'],
                        read: ['read-licensed-sub-feature-type'],
                      },
                      ui: ['licensed-sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`);
      expect(actual.features).not.toHaveProperty(`foo.licensedSubFeaturePriv`);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
    });
  });

  describe(`when license allows subfeatures, but and a licensed sub feature`, () => {
    test(`should create minimal privileges, augment the primary feature privileges, and create the licensed sub-feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'licensedSubFeaturePriv',
                      name: 'licensed sub feature priv',
                      includeIn: 'read',
                      minimumLicense: 'platinum',
                      savedObject: {
                        all: ['all-licensed-sub-feature-type'],
                        read: ['read-licensed-sub-feature-type'],
                      },
                      ui: ['licensed-sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServicePlatinum);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`);
      expect(actual.features).toHaveProperty(`foo.licensedSubFeaturePriv`);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.version,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.api.get('features'),
        actions.api.get('taskManager'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.version,
        actions.api.get('decryptedTelemetry'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.version,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);
    });
  });
});
