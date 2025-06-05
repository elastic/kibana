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

  const createNWatches = async (N: number) => {
    for (let i = 0; i < N; i++) {
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
  };

  const deleteNWatches = async (N: number) => {
    for (let i = 0; i < N; i++) {
      try {
        await es.watcher.deleteWatch({
          id: `test-watch-${i}`,
        });
      } catch (error) {
        log.debug(`[Cleanup error] Error deleting watch test-watch-${i}`);
        throw error;
      }
    }
  };

  describe('watcher', () => {
    describe('POST /api/watcher/indices/index_patterns', () => {
      before(async () => {
        try {
          await transform.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
        } catch (error) {
          log.debug('[Setup error] Error creating index pattern');
          throw error;
        }
      });

      after(async () => {
        try {
          await transform.testResources.deleteDataViewByTitle('ft_ecommerce');
        } catch (error) {
          log.debug('[Cleanup error] Error deleting index pattern');
          throw error;
        }
      });

      it('returns list of index patterns', async () => {
        const response = await supertest
          .get('/api/watcher/indices/index_patterns')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.contain('ft_ecommerce');
      });
    });

    describe('GET /api/watcher/watches', () => {
      it.skip('returns an empty array if there are no watches', async () => {
        const response = await supertest
          .get('/api/watcher/watches')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const responseWatches = response.body.watches;
        expect(responseWatches.length).to.equal(0);
      });

      it.skip('returns list of watches', async () => {
        await createNWatches(3);

        const response = await supertest
          .get('/api/watcher/watches')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const responseWatches = response.body.watches;
        expect(responseWatches.length).to.equal(3);
        expect(responseWatches[0].id).to.equal(`test-watch-0`);
        expect(responseWatches[1].id).to.equal(`test-watch-1`);
        expect(responseWatches[2].id).to.equal(`test-watch-2`);

        await deleteNWatches(3);
      });

      it('can handle a large number of watches', async () => {
        await createNWatches(10000);

        const response = await supertest
          .get('/api/watcher/watches')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const responseWatches = response.body.watches;
        expect(responseWatches.length).to.equal(10000);
        // Check the id of some of the watches
        expect(responseWatches[150].id).to.equal(`test-watch-150`);
        expect(responseWatches[9482].id).to.equal(`test-watch-9482`);
        expect(responseWatches[19592].id).to.equal(`test-watch-19592`);

        await deleteNWatches(10000);
      });
    });
  });
}
