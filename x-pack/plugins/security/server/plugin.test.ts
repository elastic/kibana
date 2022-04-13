/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { ByteSizeValue } from '@kbn/config-schema';
import { coreMock } from 'src/core/server/mocks';

import { featuresPluginMock } from '../../features/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { ConfigSchema } from './config';
import type { PluginSetupDependencies, PluginStartDependencies } from './plugin';
import { SecurityPlugin } from './plugin';

describe('Security Plugin', () => {
  let plugin: SecurityPlugin;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  let mockSetupDependencies: PluginSetupDependencies;
  let mockStartDependencies: PluginStartDependencies;
  beforeEach(() => {
    plugin = new SecurityPlugin(
      coreMock.createPluginInitializerContext(
        ConfigSchema.validate({
          session: { idleTimeout: 1500 },
          authc: {
            providers: ['saml', 'token'],
            saml: { realm: 'saml1', maxRedirectURLSize: new ByteSizeValue(2048) },
          },
        })
      )
    );

    mockCoreSetup = coreMock.createSetup();
    mockCoreSetup.http.getServerInfo.mockReturnValue({
      hostname: 'localhost',
      name: 'kibana',
      port: 80,
      protocol: 'https',
    });

    mockSetupDependencies = {
      licensing: { license$: of({}), featureUsage: { register: jest.fn() } },
      features: featuresPluginMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
    } as unknown as PluginSetupDependencies;

    mockCoreStart = coreMock.createStart();

    const mockFeaturesStart = featuresPluginMock.createStart();
    mockFeaturesStart.getKibanaFeatures.mockReturnValue([]);
    mockStartDependencies = {
      features: mockFeaturesStart,
      licensing: licensingMock.createStart(),
      taskManager: taskManagerMock.createStart(),
    };
  });

  describe('setup()', () => {
    it('exposes proper contract', () => {
      expect(plugin.setup(mockCoreSetup, mockSetupDependencies)).toMatchInlineSnapshot(`
        Object {
          "audit": Object {
            "asScoped": [Function],
            "withoutRequest": Object {
              "enabled": false,
              "log": [Function],
            },
          },
          "authc": Object {
            "getCurrentUser": [Function],
          },
          "authz": Object {
            "actions": Actions {
              "alerting": AlertingActions {
                "prefix": "alerting:version:",
              },
              "api": ApiActions {
                "prefix": "api:version:",
              },
              "app": AppActions {
                "prefix": "app:version:",
              },
              "cases": CasesActions {
                "prefix": "cases:version:",
              },
              "login": "login:",
              "savedObject": SavedObjectActions {
                "prefix": "saved_object:version:",
              },
              "space": SpaceActions {
                "prefix": "space:version:",
              },
              "ui": UIActions {
                "prefix": "ui:version:",
              },
              "version": "version:version",
              "versionNumber": "version",
            },
            "checkPrivilegesDynamicallyWithRequest": [Function],
            "checkPrivilegesWithRequest": [Function],
            "checkSavedObjectsPrivilegesWithRequest": [Function],
            "mode": Object {
              "useRbacForRequest": [Function],
            },
          },
          "license": Object {
            "features$": Observable {
              "operator": [Function],
              "source": Observable {
                "_subscribe": [Function],
              },
            },
            "getFeatures": [Function],
            "hasAtLeast": [Function],
            "isEnabled": [Function],
            "isLicenseAvailable": [Function],
          },
          "privilegeDeprecationsService": Object {
            "getKibanaRolesByFeatureId": [Function],
          },
        }
      `);
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      await plugin.setup(mockCoreSetup, mockSetupDependencies);
      expect(plugin.start(mockCoreStart, mockStartDependencies)).toMatchInlineSnapshot(`
        Object {
          "authc": Object {
            "apiKeys": Object {
              "areAPIKeysEnabled": [Function],
              "create": [Function],
              "grantAsInternalUser": [Function],
              "invalidate": [Function],
              "invalidateAsInternalUser": [Function],
            },
            "getCurrentUser": [Function],
          },
          "authz": Object {
            "actions": Actions {
              "alerting": AlertingActions {
                "prefix": "alerting:version:",
              },
              "api": ApiActions {
                "prefix": "api:version:",
              },
              "app": AppActions {
                "prefix": "app:version:",
              },
              "cases": CasesActions {
                "prefix": "cases:version:",
              },
              "login": "login:",
              "savedObject": SavedObjectActions {
                "prefix": "saved_object:version:",
              },
              "space": SpaceActions {
                "prefix": "space:version:",
              },
              "ui": UIActions {
                "prefix": "ui:version:",
              },
              "version": "version:version",
              "versionNumber": "version",
            },
            "checkPrivilegesDynamicallyWithRequest": [Function],
            "checkPrivilegesWithRequest": [Function],
            "checkSavedObjectsPrivilegesWithRequest": [Function],
            "mode": Object {
              "useRbacForRequest": [Function],
            },
          },
        }
      `);
    });
  });

  describe('stop()', () => {
    beforeEach(async () => await plugin.setup(mockCoreSetup, mockSetupDependencies));

    it('close does not throw', async () => {
      await plugin.stop();
    });
  });
});
