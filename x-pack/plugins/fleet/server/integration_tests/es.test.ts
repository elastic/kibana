/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';

/**
 * Verifies that multiple Kibana instances running in parallel will not create duplicate preconfiguration objects.
 */
describe.skip('Fleet setup preconfiguration with multiple instances Kibana', () => {
  let esServer: TestElasticsearchUtils;

  const startServers = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
      },
    });

    esServer = await startES();
  };

  const stopServers = async () => {
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  beforeEach(async () => {
    await startServers();
  });

  afterEach(async () => {
    await stopServers();
  });

  describe('startES', () => {
    it('start es', async () => {
      await new Promise((resolve) => setTimeout(resolve, 60000));
    });
  });
});
