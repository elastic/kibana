import { cargoQueue } from 'async';
import moment from 'moment';
import { omit } from 'lodash';
import { logger } from './logger';
import type { Config, Doc } from '../types';
import { getEsClient } from './get_es_client';

type CargoQueue = ReturnType<typeof cargoQueue<Doc, Error>>;
let queue: CargoQueue;

export const createQueue = (config: Config): CargoQueue => {
  queue = cargoQueue<Doc, Error>((docs, callback) => {
    const esClient = getEsClient(config);
    const body: object[] = [];
    const startTs = Date.now();
    docs.forEach((doc) => {
      const namespace = `${config.indexing.dataset}.${doc.namespace}`;
      body.push({ create: { _index: `high-cardinality-data-${namespace}-${moment(doc['@timestamp']).format('YYYY-MM-DD')}` } });
      body.push(omit(doc, 'namespace'));
    });
    esClient.bulk({ body, refresh: false }).then((resp) => {
      if (resp.body.errors) {
        logger.error(`Failed to index`);
        return callback(new Error('Failed to index'));
      }
      logger.info({ took: resp.body.took, latency: Date.now() - startTs, indexed: docs.length }, `Indexing ${docs.length} documents.`);
      return callback();
    }).catch((error) => {
      logger.error(error);
      callback(error);
    });
  }, config.indexing.concurrency, config.indexing.payloadSize);
  return queue;
};
