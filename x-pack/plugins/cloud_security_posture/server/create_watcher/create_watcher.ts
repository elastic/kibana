/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { WatcherPutWatchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { benchmarkScoreWatcher } from './benchmark_score_watcher';

export const initializeCspWatcher = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  await initializeWatcher(esClient, benchmarkScoreWatcher, logger);
};

export const initializeWatcher = async (
  esClient: ElasticsearchClient,
  watcher: WatcherPutWatchRequest,
  logger: Logger
) => {
  return createWatcherIfNotExists(esClient, watcher, logger).then((succeeded) => {
    if (succeeded) {
      startWatchIfNotStarted(esClient, watcher.id, logger);
    }
  });
};

/**
 * Checks if a watcher exists, And if not creates it
 *
 * @param watcher - the watcher to create. If a watcher with the same watcher already exists, nothing is created or updated.
 *
 * @return true if the watcher exits or created, false otherwise.
 */
export const createWatcherIfNotExists = async (
  esClient: ElasticsearchClient,
  watcher: WatcherPutWatchRequest,
  logger: Logger
) => {
  try {
    await esClient.watcher.getWatch({
      id: watcher.id,
    });
    return true;
  } catch (existErr) {
    const existError = transformError(existErr);
    if (existError.statusCode === 404) {
      try {
        await esClient.watcher.putWatch(watcher);
        logger.info(`Watcher ${watcher.id} were created`);
        return true;
      } catch (createErr) {
        const createError = transformError(createErr);
        logger.error(`Failed to create watcher ${watcher.id}: ${createError.message}`);
      }
    } else {
      logger.error(`Failed to check if watcher ${watcher.id} exists: ${existError.message}`);
    }
  }
  return false;
};

export const startWatchIfNotStarted = async (
  esClient: ElasticsearchClient,
  watcherId: string,
  logger: Logger
) => {
  try {
    const watcherStatus = await esClient.watcher.ackWatch({
      watch_id: watcherId,
    });
    if (watcherStatus.status.state.active) {
      return;
    }
    try {
      esClient.watcher.activateWatch({ watch_id: watcherId });
      logger.debug(`Watcher: ${benchmarkScoreWatcher.id} activated successfully`);
    } catch (startErr) {
      const startError = transformError(startErr);
      logger.error(`Failed activate watcher ${watcherId}: ${startError.message}`);
    }
  } catch (statsErr) {
    const statsError = transformError(statsErr);
    logger.error(`Failed to check if watcher ${watcherId} is activate: ${statsError.message}`);
  }
};

export const stopWatcher = async (esClient: ElasticsearchClient, logger: Logger) => {
  try {
    const watcherStatus = await esClient.watcher.ackWatch({
      watch_id: benchmarkScoreWatcher.id,
    });
    if (!watcherStatus.status.state.active) {
      return;
    }
    try {
      await esClient.watcher.deactivateWatch({ watch_id: benchmarkScoreWatcher.id });
      logger.debug(`Watcher: ${benchmarkScoreWatcher.id} deactivated successfully`);
    } catch (startErr) {
      const startError = transformError(startErr);
      logger.error(`Failed deactivate watcher ${benchmarkScoreWatcher.id}: ${startError.message}`);
    }
  } catch (statsErr) {
    const statsError = transformError(statsErr);
    logger.error(
      `Failed to check if watcher ${benchmarkScoreWatcher.id} is activate: ${statsError.message}`
    );
  }
};
