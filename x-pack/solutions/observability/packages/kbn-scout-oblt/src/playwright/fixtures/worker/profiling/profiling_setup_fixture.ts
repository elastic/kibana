/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationType, BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';
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
        const maxAttempts = 3;
        const delayMs = 5_000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            log.info(`Setting up profiling resources (attempt ${attempt}/${maxAttempts})`);
            await kbnClient.request({
              description: 'Setup profiling resources',
              path: '/api/profiling/setup/es_resources',
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'kbn-xsrf': 'reporting',
              },
              retries: 0,
            });
            log.info('Profiling resources set up successfully');
            return;
          } catch (error: any) {
            const status = error?.response?.status ?? error?.originalError?.response?.status;
            const body = error?.response?.data ?? error?.originalError?.response?.data;
            log.error(
              `Error setting up profiling resources POST /api/profiling/setup/es_resources: status=${status} body=${JSON.stringify(
                body
              )}`
            );

            if (attempt >= maxAttempts) {
              throw error;
            }
            log.info(`Retrying setupResources in ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
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
            const erroredItems = response.items?.filter(
              (item: Partial<Record<BulkOperationType, BulkResponseItem>>) => {
                const action = item?.index ?? item?.create ?? item?.update ?? item?.delete;
                return action?.error;
              }
            );
            log.error(
              `Some errors occurred during bulk indexing: ${JSON.stringify(erroredItems, null, 2)}`
            );

            throw new Error(
              `Bulk indexing had ${
                erroredItems?.length ?? 0
              } errors — profiling data may be incomplete`
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

        const ignoreNotFound = (error: any) => {
          if (error?.meta?.statusCode === 404) return undefined;
          throw error;
        };

        // Disable resource management so the ES profiling plugin stops
        // recreating data streams. This must happen before deleting
        // indices, otherwise the plugin immediately recreates them.
        await esClient.cluster.putSettings({
          persistent: {
            xpack: { profiling: { templates: { enabled: null } } },
          },
        });

        // ES profiling resources are mostly data streams (.profiling-stackframes-*,
        // .profiling-stacktraces-*, .profiling-executables-*, .profiling-hosts-*,
        // profiling-events-*). Deleting data streams first avoids the 400
        // "cannot_delete_data_stream_index" error from trying indices.delete() on
        // data-stream backing indices.
        await Promise.all([
          esClient.indices.deleteDataStream({ name: 'profiling-*' }).catch(ignoreNotFound),
          esClient.indices.deleteDataStream({ name: '.profiling-*' }).catch(ignoreNotFound),
        ]);

        // Delete any remaining plain indices (e.g. created by bulk create ops
        // against non-existent aliases).
        const remaining = (await esClient.cat.indices({ format: 'json' }))
          .map((index) => index.index)
          .filter(
            (name): name is string =>
              !!name && (name.startsWith('profiling') || name.startsWith('.profiling'))
          );

        for (const index of remaining) {
          await esClient.indices.delete({ index, ignore_unavailable: true }).catch(ignoreNotFound);
        }

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
