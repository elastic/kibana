/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const DEFAULT_WATCH_BODY = {
  trigger: {
    schedule: {
      interval: '30m',
    },
  },
  input: {
    search: {
      request: {
        body: {
          size: 0,
          query: {
            match_all: {},
          },
        },
        indices: ['*'],
      },
    },
  },
  condition: {
    compare: {
      'ctx.payload.hits.total': {
        gte: 10,
      },
    },
  },
  actions: {
    'my-logging-action': {
      logging: {
        text: 'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.',
      },
    },
  },
};

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const transform = getService('transform');
  const es = getService('es');

  describe('watcher', () => {
    before(async () => {
      try {
        await transform.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      } catch (error) {
        log.debug('[Setup error] Error creating index pattern');
        throw error;
      }

      for (let i = 0; i < 10; i++) {
        try {
          await es.watcher.putWatch({
            id: `test-watch-${i}`,
            active: true,
            ...DEFAULT_WATCH_BODY,
            metadata: {
              name: `My watch ${i}`,
            },
          });
        } catch (error) {
          log.debug(`[Setup error] Error creating watch test-watch-${i}`);
          throw error;
        }
      }
    });

    after(async () => {
      try {
        await transform.testResources.deleteDataViewByTitle('ft_ecommerce');
      } catch (error) {
        log.debug('[Cleanup error] Error deleting index pattern');
        throw error;
      }

      for (let i = 0; i < 10; i++) {
        try {
          await es.watcher.deleteWatch({
            id: `test-watch-${i}`,
          });
        } catch (error) {
          log.debug(`[Cleanup error] Error deleting watch test-watch-${i}`);
          throw error;
        }
      }
    });

    describe('POST /api/watcher/indices/index_patterns', () => {
      it('returns list of index patterns', async () => {
        const response = await supertest
          .get('/api/watcher/indices/index_patterns')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.contain('ft_ecommerce');
      });
    });

    describe('GET /api/watcher/watches', () => {
      it('returns list of watches', async () => {
        const response = await supertest
          .get('/api/watcher/watches')
          .set('kbn-xsrf', 'kibana')
          .query({
            pageSize: 3,
            pageIndex: 1,
            sortField: 'name',
            sortDirection: 'asc',
            query: '',
          })
          .expect(200);

        const responseWatches = response.body.watches;
        const responseTotalCount = response.body.watchCount;

        expect(responseTotalCount).to.equal(10);
        expect(responseWatches.length).to.equal(3);
        expect(responseWatches[0].id).to.equal(`test-watch-3`);
        expect(responseWatches[1].id).to.equal(`test-watch-4`);
        expect(responseWatches[2].id).to.equal(`test-watch-5`);
      });
    });
  });
}
