/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kbnTestServer from '../../../../../src/test_utils/kbn_server';
// import { IngestManagerConfigType } from '../../common/types';

describe('ingestManager', () => {
  describe('GET /ingest_manager/agent_configs', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeAll(async () => {
      const ingestManagerConfig = {
        enabled: true,
        epm: { enabled: true },
        fleet: { enabled: false },
      };
      root = kbnTestServer.createRoot({
        oss: false,
        xpack: ingestManagerConfig,
      });
      await root.setup();
      await root.start();
    }, 30000);

    afterAll(async () => await root.shutdown());
    it('validates given text', async () => {
      const response = await kbnTestServer.request
        .get(root, '/ingest_manager/agent_configs')
        .query({ text: 'input string'.repeat(100) })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('formats given text', async () => {
      const response = await kbnTestServer.request
        .get(root, '/ingest_manager/agent_configs')
        .query({ text: 'input string' })
        .expect(200);

      expect(response.text).toBe('...');
    });

    it('returns BadRequest if passed string contains banned symbols', async () => {
      await kbnTestServer.request
        .get(root, '/ingest_manager/agent_configs')
        .query({ text: '<script>' })
        .expect(400, 'Text cannot contain unescaped HTML markup.');
    });
  });
});
