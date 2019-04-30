/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';

jest.mock('../lib/es_version_precheck');
import { EsVersionPrecheck } from '../lib/es_version_precheck';
import { registerClusterCheckupRoutes } from './cluster_checkup';

// Need to require to get mock on named export to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MigrationApis = require('../lib/es_migration_apis');
MigrationApis.getUpgradeAssistantStatus = jest.fn();

function register(plugins = {}) {
  const server = new Server();
  server.plugins = {
    elasticsearch: {
      getCluster: () => ({ callWithRequest: jest.fn() } as any),
    } as any,
    ...plugins,
  } as any;
  server.config = () => ({ get: () => '' } as any);

  registerClusterCheckupRoutes(server);

  return server;
}

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_migration_apis test.
 */
describe('cluster checkup API', () => {
  const spy = jest.spyOn(MigrationApis, 'getUpgradeAssistantStatus');

  afterEach(() => jest.clearAllMocks());

  describe('with cloud enabled', () => {
    it('is provided to getUpgradeAssistantStatus', async () => {
      const server = register({
        cloud: {
          config: {
            isCloudEnabled: true,
          },
        },
      });

      MigrationApis.getUpgradeAssistantStatus.mockResolvedValue({
        cluster: [],
        indices: [],
        nodes: [],
      });
      await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/status',
      });

      expect(spy.mock.calls[0][2]).toBe(true);
    });
  });

  describe('GET /api/upgrade_assistant/reindex/{indexName}.json', () => {
    const server = register();

    it('returns state', async () => {
      MigrationApis.getUpgradeAssistantStatus.mockResolvedValue({
        cluster: [],
        indices: [],
        nodes: [],
      });
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/status',
      });

      expect(resp.statusCode).toEqual(200);
      expect(resp.payload).toMatchInlineSnapshot(
        `"{\\"cluster\\":[],\\"indices\\":[],\\"nodes\\":[]}"`
      );
    });

    it('returns an 403 error if it throws forbidden', async () => {
      const e: any = new Error(`you can't go here!`);
      e.status = 403;

      MigrationApis.getUpgradeAssistantStatus.mockRejectedValue(e);
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/status',
      });

      expect(resp.statusCode).toEqual(403);
    });

    it('returns an 500 error if it throws', async () => {
      MigrationApis.getUpgradeAssistantStatus.mockRejectedValue(new Error(`scary error!`));
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/status',
      });

      expect(resp.statusCode).toEqual(500);
    });

    it('returns a 426 if EsVersionCheck throws', async () => {
      (EsVersionPrecheck.method as jest.Mock).mockRejectedValue(
        new Boom(`blah`, { statusCode: 426 })
      );

      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/status',
      });

      expect(resp.statusCode).toEqual(426);
    });
  });
});
