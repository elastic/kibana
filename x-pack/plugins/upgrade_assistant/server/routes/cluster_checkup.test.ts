/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { registerClusterCheckupRoutes } from './cluster_checkup';

// Need to require to get mock on named export to work.
// tslint:disable:no-var-requires
const MigrationApis = require('../lib/es_migration_apis');
MigrationApis.getUpgradeAssistantStatus = jest.fn();

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_migration_apis test.
 */
describe('cluster checkup API', () => {
  const server = new Server();
  server.plugins = {
    elasticsearch: {
      getCluster: () => ({ callWithRequest: jest.fn() } as any),
    } as any,
  } as any;
  server.config = () => ({ get: () => '' } as any);

  registerClusterCheckupRoutes(server);

  describe('GET /api/upgrade_assistant/reindex/{indexName}.json', () => {
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
  });
});
