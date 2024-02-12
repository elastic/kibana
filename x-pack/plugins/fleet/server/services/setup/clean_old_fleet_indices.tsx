/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import pMap from 'p-map';

const INDICES_TO_CLEAN = [
  '.fleet-files-*',
  '.fleet-file-data-*',
  '.fleet-filedelivery-data-*',
  '.fleet-filedelivery-meta-*',
];

const INDEX_TEMPLATE_TO_CLEAN = [
  '.fleet-files',
  '.fleet-file-data',
  '.fleet-filedelivery-data',
  '.fleet-filedelivery-meta',
];

/**
 * In 8.10 upload feature moved from using index to datastreams, this function allows to clean those old indices.
 */
export async function cleanUpOldFileIndices(esClient: ElasticsearchClient, logger: Logger) {
  try {
    // Clean indices
    logger.info('Cleaning old indices');
    await pMap(
      INDICES_TO_CLEAN,
      async (indiceToClean) => {
        const res = await esClient.indices.get({
          index: indiceToClean,
        });
        const indices = Object.keys(res);
        if (indices.length) {
          await esClient.indices
            .delete({
              index: indices.join(','),
            })
            .catch((err) => {
              // Skip not found errors
              if (err.meta?.statusCode !== 404) {
                throw err;
              }
            });
        }
      },
      { concurrency: 2 }
    );
    await esClient.indices
      .deleteIndexTemplate({
        name: INDEX_TEMPLATE_TO_CLEAN.join(','),
      })
      .catch((err) => {
        // Skip not found errors
        if (err.meta?.statusCode !== 404) {
          throw err;
        }
      });
    // Clean index template
  } catch (err) {
    logger.warn(`Old fleet indices cleanup failed: ${err.message}`);
  }
}
