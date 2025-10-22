/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';
import path from 'path';
import fs from 'fs';

export interface ProfilingSetupFixture {
  checkStatus: () => Promise<{ has_setup: boolean; has_data: boolean }>;
  setupResources: () => Promise<void>;
  loadData: () => Promise<void>;
}

export const profilingSetupFixture = base.extend<{}, { profilingSetup: ProfilingSetupFixture }>({
  profilingSetup: [
    async ({ kbnClient, esClient, log }, use) => {
      const checkStatus = async (): Promise<{ has_setup: boolean; has_data: boolean }> => {
        try {
          const response = await (kbnClient as KbnClient).request({
            description: 'Check profiling status',
            path: '/api/profiling/status',
            method: 'GET',
          });
          return response.data as { has_setup: boolean; has_data: boolean };
        } catch (error: any) {
          if (error.status === 404) {
            return { has_setup: false, has_data: false };
          }
          throw error;
        }
      };

      const setupResources = async (): Promise<void> => {
        log.info('Setting up profiling resources');
        await (kbnClient as KbnClient).request({
          description: 'Setup profiling resources',
          path: '/api/profiling/setup/es_resources',
          method: 'POST',
          body: {},
        });
      };

      const loadData = async (): Promise<void> => {
        log.info('Loading profiling data');

        const PROFILING_DATA_PATH = path.join(
          __dirname,
          './test_data/profiling_data_anonymized.json'
        );

        const profilingData = fs.readFileSync(PROFILING_DATA_PATH, 'utf8');
        const operations = profilingData.split('\n').filter((line: string) => line.trim());

        // Use esClient for bulk operations
        await esClient.bulk({
          body: operations.join('\n') + '\n',
          refresh: 'wait_for',
          timeout: '1m',
        });
      };

      await use({
        checkStatus,
        setupResources,
        loadData,
      });
    },
    { scope: 'worker' },
  ],
});
