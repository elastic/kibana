/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cargoQueue } from 'async';
import moment from 'moment';
import { omit } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Doc } from '../../common/types';
import type { Config } from '../types';
import type { QueueRegistry } from '../queue/queue_registry';

type CargoQueue = ReturnType<typeof cargoQueue<Doc, Error>>;
let queue: CargoQueue;

export const createQueue = ({
  client,
  config,
  logger,
  queueRegistry,
}: {
  client: ElasticsearchClient;
  config: Config;
  logger: Logger;
  queueRegistry: QueueRegistry;
}): CargoQueue => {
  queue = cargoQueue<Doc, Error>(
    (docs, callback) => {
      const body: object[] = [];
      const startTs = Date.now();

      docs.forEach((doc) => {
        const namespace = `${config.indexing.dataset}.${doc.namespace}`;
        body.push({
          create: {
            _index: `high-cardinality-data-${namespace}-${moment(doc['@timestamp']).format(
              'YYYY-MM-DD'
            )}`,
          },
        });
        body.push(omit(doc, 'namespace'));
      });

      client
        .bulk({ body, refresh: false })
        .then((resp) => {
          if (resp.errors) {
            logger.error(`Failed to index`);
            return callback(new Error('Failed to index'));
          }
          logger.info(
            `Indexing ${docs.length} documents. Took: ${resp.took}, latency: ${
              Date.now() - startTs
            }, indexed: ${docs.length}`
          );
        })
        .catch((error) => {
          logger.error(error);
          callback(error);
        });
    },
    config.indexing.concurrency,
    config.indexing.payloadSize
  );
  return queue;
};
