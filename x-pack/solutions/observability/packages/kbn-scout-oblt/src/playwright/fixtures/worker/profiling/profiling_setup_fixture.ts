/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import path from 'path';
import fs from 'fs';

export interface ProfilingSetupFixture {
  checkStatus: () => Promise<{ has_setup: boolean; has_data: boolean }>;
  setupResources: () => Promise<void>;
  loadData: (file?: string) => Promise<void>;
  cleanup: () => Promise<void>;
}

// This fixture should be used only in the global setup hook
// because it needs to be run before any other test
// and it needs to be run only once
export const profilingSetupFixture = base.extend<{}, { profilingSetup: ProfilingSetupFixture }>({
  profilingSetup: [
    async ({ kbnClient, esClient, log }, use) => {
      const checkStatus = async (): Promise<{ has_setup: boolean; has_data: boolean }> => {
        try {
          const response = await kbnClient.request({
            description: 'Check profiling status',
            path: '/api/profiling/setup/es_resources',
            method: 'GET',
          });
          return response.data as { has_setup: boolean; has_data: boolean };
        } catch (error: any) {
          log.error(`Error checking profiling status: ${error}`);
          return { has_setup: false, has_data: false };
        }
      };

      const setupResources = async (): Promise<void> => {
        try {
          log.info('Setting up profiling resources');
          await kbnClient.request({
            description: 'Setup profiling resources',
            path: '/api/profiling/setup/es_resources',
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'kbn-xsrf': 'reporting',
            },
          });
          log.info('Profiling resources set up successfully');
        } catch (error) {
          log.error(`Error setting up profiling resources: ${error}`);
          throw error;
        }
      };

      const loadData = async (file?: string): Promise<void> => {
        try {
          log.info('Loading profiling data');

          const PROFILING_DATA_PATH = path.join(
            __dirname,
            './test_data/profiling_data_anonymized.json'
          );

          const dataFilePath = file || PROFILING_DATA_PATH;

          if (!fs.existsSync(dataFilePath)) {
            log.info('Profiling data file not found, skipping data loading');
            return;
          }

          const profilingData = fs.readFileSync(dataFilePath, 'utf8');
          const operations = profilingData.split('\n').filter((line: string) => line.trim());

          // Use esClient for bulk operations
          const response = await esClient.bulk({
            body: operations.join('\n') + '\n',
            refresh: 'wait_for',
            timeout: '1m',
          });

          if (response.errors) {
            const erroredItems = response.items?.filter((item: any) => item?.index?.error);
            log.error(
              `Some errors occurred during bulk indexing: ${JSON.stringify(erroredItems, null, 2)}`
            );
          } else {
            log.info(`Successfully indexed ${response.items?.length || 0} profiling documents`);
          }
        } catch (error) {
          log.error(`Error loading profiling data: ${error}`);
          throw error;
        }
      };
      const cleanup = async (): Promise<void> => {
        log.info(`Unloading Profiling data`);

        const indices = await esClient.cat.indices({ format: 'json' });

        const profilingIndices = indices
          .filter((index) => index.index !== undefined)
          .map((index) => index.index)
          .filter((index) => {
            return index!.startsWith('profiling') || index!.startsWith('.profiling');
          }) as string[];

        await Promise.all([
          ...profilingIndices.map((index) => esClient.indices.delete({ index })),
          esClient.indices.deleteDataStream({
            name: 'profiling-events*',
          }),
        ]);
        log.info('Unloaded Profiling data');
      };

      await use({
        checkStatus,
        setupResources,
        loadData,
        cleanup,
      });
    },
    { scope: 'worker' },
  ],
});
