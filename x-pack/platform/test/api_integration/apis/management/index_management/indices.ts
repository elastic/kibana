/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { sortedExpectedIndexKeys } from './constants';
import { indicesApi } from './lib/indices.api';
import { indicesHelpers } from './lib/indices.helpers';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const { createIndex, deleteAllIndices, catIndex, indexStats } = indicesHelpers(getService);

  const {
    closeIndex,
    openIndex,
    deleteIndex,
    flushIndex,
    refreshIndex,
    forceMerge,
    list,
    reload,
    clearCache,
    create,
  } = indicesApi(getService);

  describe('indices', () => {
    after(async () => await deleteAllIndices());

    describe('create', () => {
      it('should create an index', async () => {
        const indexName = 'test-create-index-1';
        await create(indexName, 'logsdb').expect(200);

        const { body: indices } = await catIndex(indexName, 'i');
        expect(indices.map((indexItem) => indexItem.i)).to.contain(indexName);

        await es.indices.delete({ index: indexName });
      });

      it('should require index name to be provided', async () => {
        const { body } = await create(undefined, 'standard').expect(400);
        expect(body.message).to.contain('expected value of type [string]');
      });

      it('should require index mode to be provided', async () => {
        const { body } = await create('test-create-index-2', undefined).expect(400);
        expect(body.message).to.contain('expected value of type [string]');
      });
    });

    describe('clear cache', () => {
      it('should clear the cache on a single index', async () => {
        const index = await createIndex();
        await clearCache(index).expect(200);
      });
    });

    describe('close', function () {
      it('should close an index', async () => {
        const index = await createIndex();

        // Make sure the index is open
        const {
          body: [cat1],
        } = await catIndex(index);
        expect(cat1.status).to.be('open');

        await closeIndex(index).expect(200);

        // Make sure the index has been closed
        const {
          body: [cat2],
        } = await catIndex(index);
        expect(cat2.status).to.be('close');
      });
    });

    describe('open', function () {
      it('should open an index', async () => {
        const index = await createIndex();

        await closeIndex(index);

        // Make sure the index is closed
        const {
          body: [cat1],
        } = await catIndex(index);
        expect(cat1.status).to.be('close');

        await openIndex(index).expect(200);

        // Make sure the index is opened
        const {
          body: [cat2],
        } = await catIndex(index);
        expect(cat2.status).to.be('open');
      });
    });

    describe('delete', () => {
      it('should delete an index', async () => {
        const index = await createIndex();

        const { body: indices1 } = await catIndex(undefined, 'i');
        expect(indices1.map((indexItem) => indexItem.i)).to.contain(index);

        await deleteIndex(index).expect(200);

        const { body: indices2 } = await catIndex(undefined, 'i');
        expect(indices2.map((indexItem) => indexItem.i)).not.to.contain(index);
      });

      it('should require index or indices to be provided', async () => {
        const { body } = await deleteIndex().expect(400);
        expect(body.message).to.contain('expected value of type [string]');
      });
    });

    describe('flush', () => {
      it('should flush an index', async () => {
        const index = await createIndex();

        const {
          body: { indices: indices1 },
        } = await indexStats(index, 'flush');
        // @ts-ignore
        expect(indices1[index].total.flush.total).to.be(0);

        await flushIndex(index).expect(200);

        const {
          body: { indices: indices2 },
        } = await indexStats(index, 'flush');
        // @ts-ignore
        expect(indices2[index].total.flush.total).to.be(1);
      });
    });

    describe('refresh', () => {
      it('should refresh an index', async () => {
        const index = await createIndex();

        const {
          body: { indices: indices1 },
        } = await indexStats(index, 'refresh');
        // @ts-ignore
        const previousRefreshes = indices1[index].total.refresh.total;

        await refreshIndex(index).expect(200);

        const {
          body: { indices: indices2 },
        } = await indexStats(index, 'refresh');
        // @ts-ignore
        expect(indices2[index].total.refresh.total).to.be(previousRefreshes + 1);
      });
    });

    describe('forcemerge', () => {
      it('should force merge an index', async () => {
        const index = await createIndex();
        await forceMerge(index).expect(200);
      });

      it('should allow to define the number of segments', async () => {
        const index = await createIndex();
        await forceMerge(index, { maxNumSegments: 1 }).expect(200);
      });
    });

    describe('list', function () {
      it('should list all the indices with the expected properties and data enrichers', async function () {
        // Create an index that we can assert against
        await createIndex('test_index');

        // Verify indices request
        const { body: indices } = await list().expect(200);

        // Find the "test_index" created to verify expected keys
        const indexCreated = indices.find((index: { name: string }) => index.name === 'test_index');

        const sortedReceivedKeys = Object.keys(indexCreated).sort();

        expect(sortedReceivedKeys).to.eql(sortedExpectedIndexKeys);
      });
    });

    describe('reload', function () {
      it('should list all the indices with the expected properties and data enrichers', async function () {
        // create an index to assert against, otherwise the test is flaky
        await createIndex('reload-test-index');
        const { body } = await reload().expect(200);

        const indexCreated = body.find(
          (index: { name: string }) => index.name === 'reload-test-index'
        );
        const sortedReceivedKeys = Object.keys(indexCreated).sort();
        expect(sortedReceivedKeys).to.eql(sortedExpectedIndexKeys);
        expect(body.length > 1).to.be(true); // to contrast it with the next test
      });

      it('should allow reloading only certain indices', async () => {
        const index = await createIndex();
        const { body } = await reload([index]);

        expect(body.length === 1).to.be(true);
        expect(body[0].name).to.be(index);
      });
    });
  });
}
