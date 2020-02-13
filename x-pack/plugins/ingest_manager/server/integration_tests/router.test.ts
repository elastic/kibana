/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import * as kbnTestServer from '../../../../../src/test_utils/kbn_server';

function createXPackRoot(config: {} = {}) {
  return kbnTestServer.createRoot({
    plugins: {
      scanDirs: [],
      paths: [
        resolve(__dirname, '../../../../../x-pack/plugins/encrypted_saved_objects'),
        resolve(__dirname, '../../../../../x-pack/plugins/ingest_manager'),
        resolve(__dirname, '../../../../../x-pack/plugins/licensing'),
      ],
    },
    migrations: { skip: true },
    xpack: config,
  });
}

describe('ingestManager', () => {
  describe('default. manager, EPM, and Fleet all disabled', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeAll(async () => {
      root = createXPackRoot();
      await root.setup();
      await root.start();
    }, 30000);

    afterAll(async () => await root.shutdown());

    it('does not have agent config API', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/agent_configs').expect(404);
    });

    it('does not have datasources api', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/datasources').expect(404);
    });

    it('does not have EPM api', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/epm').expect(404);
    });

    it('does not have Fleet api', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/fleet').expect(404);
    });
  });

  describe('manager enabled (no EPM, no Fleet)', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeAll(async () => {
      const ingestManagerConfig = {
        enabled: true,
        epm: { enabled: true },
        fleet: { enabled: true },
      };
      root = createXPackRoot({
        ingestManager: ingestManagerConfig,
      });
      await root.setup();
      await root.start();
    }, 30000);

    afterAll(async () => await root.shutdown());

    it('has agent config API', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/agent_configs').expect(200);
    });

    it('has datasources api', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/datasources').expect(200);
    });

    it('does not have EPM api', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/epm').expect(404);
    });

    it('does not have Fleet api', async () => {
      await kbnTestServer.request.get(root, '/api/ingest_manager/fleet').expect(404);
    });
  });
});
