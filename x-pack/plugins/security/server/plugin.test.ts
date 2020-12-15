/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { ByteSizeValue } from '@kbn/config-schema';
import { ILegacyCustomClusterClient } from '../../../../src/core/server';
import { ConfigSchema } from './config';
import { Plugin, PluginSetupDependencies, PluginStartDependencies } from './plugin';

import { coreMock, elasticsearchServiceMock } from '../../../../src/core/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';

describe('Security Plugin', () => {
  let plugin: Plugin;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  let mockClusterClient: jest.Mocked<ILegacyCustomClusterClient>;
  let mockSetupDependencies: PluginSetupDependencies;
  let mockStartDependencies: PluginStartDependencies;
  beforeEach(() => {
    plugin = new Plugin(
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

    mockClusterClient = elasticsearchServiceMock.createLegacyCustomClusterClient();
    mockCoreSetup.elasticsearch.legacy.createClient.mockReturnValue(mockClusterClient);

    mockSetupDependencies = ({
      licensing: { license$: of({}), featureUsage: { register: jest.fn() } },
      features: featuresPluginMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
    } as unknown) as PluginSetupDependencies;

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
    it('exposes proper contract', async () => {
      await expect(plugin.setup(mockCoreSetup, mockSetupDependencies)).resolves
        .toMatchInlineSnapshot(`
              Object {
                "audit": Object {
                  "asScoped": [Function],
                  "getLogger": [Function],
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
                  "mode": Object {
                    "useRbacForRequest": [Function],
                  },
                },
                "license": Object {
                  "features$": Observable {
                    "_isScalar": false,
                    "operator": MapOperator {
                      "project": [Function],
                      "thisArg": undefined,
                    },
                    "source": Observable {
                      "_isScalar": false,
                      "_subscribe": [Function],
                    },
                  },
                  "getFeatures": [Function],
                  "getType": [Function],
                  "isEnabled": [Function],
                  "isLicenseAvailable": [Function],
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
