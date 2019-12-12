/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { ByteSizeValue } from '@kbn/config-schema';
import { IClusterClient, CoreSetup } from '../../../../src/core/server';
import { Plugin, PluginSetupDependencies } from './plugin';

import { coreMock, elasticsearchServiceMock } from '../../../../src/core/server/mocks';

describe('Security Plugin', () => {
  let plugin: Plugin;
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockDependencies: PluginSetupDependencies;
  beforeEach(() => {
    plugin = new Plugin(
      coreMock.createPluginInitializerContext({
        cookieName: 'sid',
        session: {
          idleTimeout: 1500,
          lifespan: null,
        },
        authc: {
          providers: ['saml', 'token'],
          saml: { realm: 'saml1', maxRedirectURLSize: new ByteSizeValue(2048) },
        },
      })
    );

    mockCoreSetup = coreMock.createSetup();
    mockCoreSetup.http.isTlsEnabled = true;

    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockCoreSetup.elasticsearch.createClient.mockReturnValue(
      (mockClusterClient as unknown) as jest.Mocked<IClusterClient>
    );

    mockDependencies = { licensing: { license$: of({}) } } as PluginSetupDependencies;
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      await expect(plugin.setup(mockCoreSetup, mockDependencies)).resolves.toMatchInlineSnapshot(`
              Object {
                "__legacyCompat": Object {
                  "config": Object {
                    "authc": Object {
                      "providers": Array [
                        "saml",
                        "token",
                      ],
                    },
                    "cookieName": "sid",
                    "loginAssistanceMessage": undefined,
                    "secureCookies": true,
                    "session": Object {
                      "idleTimeout": 1500,
                      "lifespan": null,
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
                  "registerLegacyAPI": [Function],
                  "registerPrivilegesWithCluster": [Function],
                },
                "authc": Object {
                  "createAPIKey": [Function],
                  "getCurrentUser": [Function],
                  "getSessionInfo": [Function],
                  "invalidateAPIKey": [Function],
                  "isAuthenticated": [Function],
                  "login": [Function],
                  "logout": [Function],
                },
                "authz": Object {
                  "actions": Actions {
                    "allHack": "allHack:",
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
                "registerSpacesService": [Function],
              }
            `);
    });

    it('properly creates cluster client instance', async () => {
      await plugin.setup(mockCoreSetup, mockDependencies);

      expect(mockCoreSetup.elasticsearch.createClient).toHaveBeenCalledTimes(1);
      expect(mockCoreSetup.elasticsearch.createClient).toHaveBeenCalledWith('security', {
        plugins: [require('../../../legacy/server/lib/esjs_shield_plugin')],
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
