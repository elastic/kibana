/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { kibanaAssets } from '../data_sources';
import { Config } from '../types';
import { installKibanaAssets } from './install_kibana_assets';

export async function installDatasetAssets({
  config,
  logger,
  soClient,
}: {
  config: Config;
  logger: Logger;
  soClient: SavedObjectsClientContract;
}) {
  const { indexing, installAssets } = config;
  if (!installAssets) {
    return Promise.resolve();
  }

  const filePaths = kibanaAssets[indexing.dataset];

  if (filePaths.length) {
    logger.info(`Installing Kibana assets for ${indexing.dataset}`);

    return Promise.all(
      filePaths.map((path) => installKibanaAssets({ filePath: path, logger, soClient }))
    );
  }
  return Promise.resolve();
}
