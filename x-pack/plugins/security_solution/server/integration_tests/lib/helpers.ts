/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidGen } from 'uuid';
import Fs from 'fs';
import Util from 'util';
import type { ElasticsearchClient } from '@kbn/core/server';
import deepmerge from 'deepmerge';
import { createTestServers, createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
const asyncUnlink = Util.promisify(Fs.unlink);

/**
 * Eventually runs a callback until it succeeds or times out.
 * Inspired in https://kotest.io/docs/assertions/eventually.html
 *
 * @param cb The callback to run/retry
 * @param duration The maximum duration to run the callback, default 10000 millisecs
 * @param interval The interval between each run, default 100 millisecs
 */
export async function eventually<T>(
  cb: () => Promise<T>,
  duration: number = 120000,
  interval: number = 3000
) {
  let elapsed = 0;

  while (true) {
    const startedAt: number = performance.now();
    try {
      return await cb();
    } catch (e) {
      if (elapsed >= duration) {
        throw e;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
    elapsed += performance.now() - startedAt;
  }
}

export async function setupTestServers(logFilePath: string, settings = {}) {
  const { startES } = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: {
      es: {
        license: 'trial',
      },
    },
  });

  const esServer = await startES();

  const root = createRootWithCorePlugins(
    deepmerge(
      {
        logging: {
          appenders: {
            file: {
              type: 'file',
              fileName: logFilePath,
              layout: {
                type: 'json',
              },
            },
          },
          root: {
            level: 'warn',
          },
          loggers: [
            {
              name: 'plugins.taskManager',
              level: 'warn',
              appenders: ['file'],
            },
            {
              name: 'plugins.securitySolution.telemetry_events',
              level: 'all',
              appenders: ['file'],
            },
          ],
        },
      },
      settings
    ),
    { oss: false }
  );

  await root.preboot();
  const coreSetup = await root.setup();
  const coreStart = await root.start();

  return {
    esServer,
    kibanaServer: {
      root,
      coreSetup,
      coreStart,
      stop: async () => root.shutdown(),
    },
  };
}

export async function removeFile(path: string) {
  await asyncUnlink(path).catch(() => void 0);
}

export async function bulkInsert(
  esClient: ElasticsearchClient,
  index: string,
  data: unknown[],
  ids: string[] = []
): Promise<void> {
  const bulk = data.flatMap((d, i) => {
    const _id = ids[i] ?? uuidGen();
    return [{ create: { _index: index, _id } }, d];
  });
  await esClient.bulk({ body: bulk, refresh: 'wait_for' }).catch(() => {});
}

export function updateTimestamps(data: object[]): object[] {
  const currentTimeMillis = new Date().getTime();
  return data.map((d, i) => {
    // wait a couple of millisecs to not make timestamps overlap
    return { ...d, '@timestamp': new Date(currentTimeMillis + (i + 1) * 100) };
  });
}
