/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const logger = getService('log');

  const INDEX_NAME = 'myfakeindex-1';
  const ES_CLIENT_HEADERS = {
    'x-elastic-product-origin': 'kibana',
  };

  describe('es client bulk', function () {
    beforeEach(async () => {
      const indexExistsResponse = await es.indices.exists({
        index: INDEX_NAME,
      });
      logger.info('test beforeEach - index exists', indexExistsResponse);

      await es.indices.create(
        {
          index: INDEX_NAME,
          mappings: {
            dynamic: 'strict',
            properties: {
              message: {
                type: 'text',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256,
                  },
                },
              },
              '@timestamp': {
                type: 'date',
              },
            },
          },
        },
        {
          headers: ES_CLIENT_HEADERS,
        }
      );

      const searchResponseBefore = await es.search({
        index: INDEX_NAME,
      });
      logger.info('es_client_bulk before bulk - hits.total', searchResponseBefore.hits.total);

      await es.helpers.bulk(
        {
          retries: 5,
          concurrency: 1,
          datasource: [{ message: 'hello world 3', '@timestamp': '2020-12-16T15:16:18.570Z' }],
          onDocument(doc) {
            return {
              index: { _index: INDEX_NAME },
            };
          },
          onDrop(dropped) {
            logger.info('DROPPED DOC', dropped);
          },
          refreshOnCompletion: true,
        },
        {
          headers: ES_CLIENT_HEADERS,
        }
      );

      const searchResponseAfter = await es.search({
        index: INDEX_NAME,
      });
      logger.info('es_client_bulk after bulk - hits.total', searchResponseAfter.hits.total);
    });

    afterEach(async () => {
      await es.indices.delete({ index: INDEX_NAME });
    });

    describe('assertions on inserted documents', () => {
      Array(400)
        .fill(0)
        .forEach(() => {
          it('should have one document', async () => {
            const searchResponse = await es.search({
              index: INDEX_NAME,
            });

            logger.info('shards', searchResponse._shards);
            logger.info('hits.total', searchResponse.hits.total);

            expect(searchResponse.hits.hits).toEqual([
              expect.objectContaining({
                _index: INDEX_NAME,
                _source: {
                  message: 'hello world 3',
                  '@timestamp': '2020-12-16T15:16:18.570Z',
                },
              }),
            ]);
          });
        });
    });
  });
}
