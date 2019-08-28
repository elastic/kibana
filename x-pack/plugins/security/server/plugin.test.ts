/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, elasticsearchServiceMock } from '../../../../src/core/server/mocks';

import { Plugin } from './plugin';
import { ClusterClient, CoreSetup } from '../../../../src/core/server';

describe('Security Plugin', () => {
  let plugin: Plugin;
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockClusterClient: jest.Mocked<PublicMethodsOf<ClusterClient>>;
  beforeEach(() => {
    plugin = new Plugin(
      coreMock.createPluginInitializerContext({
        cookieName: 'sid',
        sessionTimeout: 1500,
        authc: { providers: ['saml', 'token'], saml: { realm: 'saml1' } },
      })
    );

    mockCoreSetup = coreMock.createSetup();
    mockCoreSetup.http.isTlsEnabled = true;

    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockCoreSetup.elasticsearch.createClient.mockReturnValue(
      (mockClusterClient as unknown) as jest.Mocked<ClusterClient>
    );
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      await expect(plugin.setup(mockCoreSetup)).resolves.toMatchInlineSnapshot(`
              Object {
                "authc": Object {
                  "createAPIKey": [Function],
                  "getCurrentUser": [Function],
                  "invalidateAPIKey": [Function],
                  "isAuthenticated": [Function],
                  "login": [Function],
                  "logout": [Function],
                },
                "config": Object {
                  "authc": Object {
                    "providers": Array [
                      "saml",
                      "token",
                    ],
                  },
                  "cookieName": "sid",
                  "secureCookies": true,
                  "sessionTimeout": 1500,
                },
                "registerLegacyAPI": [Function],
              }
            `);
    });

    it('properly creates cluster client instance', async () => {
      await plugin.setup(mockCoreSetup);

      expect(mockCoreSetup.elasticsearch.createClient).toHaveBeenCalledTimes(1);
      expect(mockCoreSetup.elasticsearch.createClient).toHaveBeenCalledWith('security', {
        plugins: [require('../../../legacy/server/lib/esjs_shield_plugin')],
      });
    });
  });

  describe('stop()', () => {
    beforeEach(async () => await plugin.setup(mockCoreSetup));

    it('properly closes cluster client instance', async () => {
      expect(mockClusterClient.close).not.toHaveBeenCalled();

      await plugin.stop();

      expect(mockClusterClient.close).toHaveBeenCalledTimes(1);
    });
  });
});
