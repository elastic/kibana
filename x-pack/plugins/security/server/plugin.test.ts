/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { ByteSizeValue } from '@kbn/config-schema';
import { ILegacyCustomClusterClient } from '../../../../src/core/server';
import { elasticsearchClientPlugin } from './elasticsearch_client_plugin';
import { Plugin, PluginSetupDependencies } from './plugin';

import { coreMock, elasticsearchServiceMock } from '../../../../src/core/server/mocks';

describe('Security Plugin', () => {
  let plugin: Plugin;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
  let mockClusterClient: jest.Mocked<ILegacyCustomClusterClient>;
  let mockDependencies: PluginSetupDependencies;
  beforeEach(() => {
    plugin = new Plugin(
      coreMock.createPluginInitializerContext({
        cookieName: 'sid',
        session: {
          idleTimeout: 1500,
          lifespan: null,
        },
        audit: { enabled: false },
        authc: {
          selector: { enabled: false },
          providers: ['saml', 'token'],
          saml: { realm: 'saml1', maxRedirectURLSize: new ByteSizeValue(2048) },
          http: { enabled: true, autoSchemesEnabled: true, schemes: ['apikey'] },
        },
      })
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

    mockDependencies = ({
      licensing: { license$: of({}), featureUsage: { register: jest.fn() } },
    } as unknown) as PluginSetupDependencies;
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      await expect(plugin.setup(mockCoreSetup, mockDependencies)).resolves.toMatchInlineSnapshot(`
              Object {
                "audit": Object {
                  "getLogger": [Function],
                },
                "authc": Object {
                  "areAPIKeysEnabled": [Function],
                  "createAPIKey": [Function],
                  "getCurrentUser": [Function],
                  "grantAPIKeyAsInternalUser": [Function],
                  "invalidateAPIKey": [Function],
                  "invalidateAPIKeyAsInternalUser": [Function],
                  "isAuthenticated": [Function],
                },
                "authz": Object {
                  "actions": Actions {
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
                  "isEnabled": [Function],
                },
                "registerSpacesService": [Function],
              }
            `);
    });

    it('properly creates cluster client instance', async () => {
      await plugin.setup(mockCoreSetup, mockDependencies);

      expect(mockCoreSetup.elasticsearch.legacy.createClient).toHaveBeenCalledTimes(1);
      expect(mockCoreSetup.elasticsearch.legacy.createClient).toHaveBeenCalledWith('security', {
        plugins: [elasticsearchClientPlugin],
      });
    });
  });

  describe('stop()', () => {
    beforeEach(async () => await plugin.setup(mockCoreSetup, mockDependencies));

    it('properly closes cluster client instance', async () => {
      expect(mockClusterClient.close).not.toHaveBeenCalled();

      await plugin.stop();

      expect(mockClusterClient.close).toHaveBeenCalledTimes(1);
    });
  });
});
