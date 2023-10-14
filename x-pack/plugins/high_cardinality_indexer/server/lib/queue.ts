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

type CargoQueue = ReturnType<typeof cargoQueue<Doc, Error>>;
let queue: CargoQueue;

export const createQueue = ({
  client,
  config,
  logger,
}: {
  client: ElasticsearchClient;
  config: Config;
  logger: Logger;
}): CargoQueue => {
  queue = cargoQueue<Doc, Error>(
    (docs, callback) => {
      const body: object[] = [];
      const startTs = Date.now();

      let indexName: string = '';

      docs.forEach((doc) => {
        indexName = `high-cardinality-data-${config.indexing.dataset}.${doc.namespace}-${moment(
          doc['@timestamp']
        ).format('YYYY-MM-DD')}`;
        body.push({
          create: {
            _index: indexName,
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
            `Indexed ${docs.length} documents into index ${indexName}. Took: ${
              resp.took
            }, latency: ${Date.now() - startTs}, indexed: ${docs.length}`
          );
          return callback();
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
