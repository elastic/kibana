/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { REINDEX_OP_TYPE } from '@kbn/upgrade-assistant-plugin/common/types';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
// import { generateNewIndexName } from '@kbn/reindex-service-plugin';
import { getIndexState, Version } from '@kbn/upgrade-assistant-pkg-server';
import type { ResolveIndexResponseFromES } from '@kbn/upgrade-assistant-pkg-server';
import { sortBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const versionService = new Version();
  versionService.setup('8.0.0');

  // Utility function that keeps polling API until reindex operation has completed or failed.
  const waitForReindexToComplete = async (indexName: string) => {
    let lastState;

    while (true) {
      lastState = (await supertest.get(`/api/upgrade_assistant/reindex/${indexName}`).expect(200))
        .body.reindexOp;
      // Once the operation is completed or failed and unlocked, stop polling.
      if (lastState.status !== ReindexStatus.inProgress && lastState.locked === null) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return lastState;
  };

  describe.skip('reindexing', function () {
    this.onlyEsVersion('8');
    // bail on first error in this suite since cases sequentially depend on each other
    this.bail(true);

    afterEach(() => {
      // Cleanup saved objects
      return es.deleteByQuery({
        index: '.kibana',
        refresh: true,
        query: {
          simple_query_string: {
            query: REINDEX_OP_TYPE,
            fields: ['type'],
          },
        },
      });
    });

    it('should create a new index with the same documents', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/upgrade_assistant/reindex');

      const { dummydata: originalIndex } = await es.indices.get({
        index: 'dummydata',
        flat_settings: true,
      });

      const { body } = await supertest
        .post(`/api/upgrade_assistant/reindex/dummydata`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.indexName).to.equal('dummydata');
      expect(body.status).to.equal(ReindexStatus.inProgress);

      const lastState = await waitForReindexToComplete('dummydata');
      expect(lastState.errorMessage).to.equal(null);
      expect(lastState.status).to.equal(ReindexStatus.completed);

      const { newIndexName } = lastState;
      const indexSummary = await es.indices.get({ index: 'dummydata', flat_settings: true });

      // The new index was created
      expect(indexSummary[newIndexName]).to.be.an('object');
      // The original index name is aliased to the new one
      expect(indexSummary[newIndexName].aliases?.dummydata).to.be.an('object');
      // Verify mappings exist on new index
      expect(indexSummary[newIndexName].mappings?.properties).to.be.an('object');
      // Verify settings exist on new index
      expect(indexSummary[newIndexName].settings).to.be.an('object');
      expect({
        'index.number_of_replicas':
          indexSummary[newIndexName].settings?.['index.number_of_replicas'],
        'index.refresh_interval': indexSummary[newIndexName].settings?.['index.refresh_interval'],
      }).to.eql({
        'index.number_of_replicas': originalIndex.settings?.['index.number_of_replicas'],
        'index.refresh_interval': originalIndex.settings?.['index.refresh_interval'],
      });
      // The number of documents in the new index matches what we expect
      expect((await es.count({ index: lastState.newIndexName })).count).to.be(3);

      // Cleanup newly created index
      await es.indices.delete({
        index: lastState.newIndexName,
      });
    });

    it('should match the same original index settings after reindex', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/upgrade_assistant/reindex');

      const originalSettings = {
        'index.number_of_replicas': 1,
        'index.refresh_interval': '10s',
      };

      // Forcing custom settings
      await es.indices.putSettings({
        index: 'dummydata',
        settings: originalSettings,
      });

      await supertest
        .post(`/api/upgrade_assistant/reindex/dummydata`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const lastState = await waitForReindexToComplete('dummydata');
      expect(lastState.errorMessage).to.equal(null);
      expect(lastState.status).to.equal(ReindexStatus.completed);

      const { newIndexName } = lastState;
      const indexSummary = await es.indices.get({ index: 'dummydata', flat_settings: true });

      // The new index was created
      expect(indexSummary[newIndexName]).to.be.an('object');
      // The original index name is aliased to the new one
      expect(indexSummary[newIndexName].aliases?.dummydata).to.be.an('object');
      // Verify mappings exist on new index
      expect(indexSummary[newIndexName].mappings?.properties).to.be.an('object');
      // Verify settings exist on new index
      expect(indexSummary[newIndexName].settings).to.be.an('object');
      expect({
        'index.number_of_replicas':
          indexSummary[newIndexName].settings?.['index.number_of_replicas'],
        'index.refresh_interval': indexSummary[newIndexName].settings?.['index.refresh_interval'],
      }).to.eql(originalSettings);

      // Cleanup newly created index
      await es.indices.delete({
        index: lastState.newIndexName,
      });
    });

    it('can resume after reindexing was stopped right after creating the new index', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/upgrade_assistant/reindex');

      // This new index is the new soon to be created reindexed index. We create it
      // upfront to simulate a situation in which the user restarted kibana half
      // way through the reindex process and ended up with an extra index.
      await es.indices.create({ index: 'reindexed-v8-dummydata' });

      const { body } = await supertest
        .post(`/api/upgrade_assistant/reindex/dummydata`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.indexName).to.equal('dummydata');
      expect(body.status).to.equal(ReindexStatus.inProgress);

      const lastState = await waitForReindexToComplete('dummydata');
      expect(lastState.errorMessage).to.equal(null);
      expect(lastState.status).to.equal(ReindexStatus.completed);

      // Cleanup newly created index
      await es.indices.delete({
        index: lastState.newIndexName,
      });
    });

    it('should update any aliases', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/upgrade_assistant/reindex');

      // Add aliases and ensure each returns the right number of docs
      await es.indices.updateAliases({
        actions: [
          { add: { index: 'dummydata', alias: 'myAlias' } },
          { add: { index: 'dummy*', alias: 'wildcardAlias' } },
          {
            add: { index: 'dummydata', alias: 'myHttpsAlias', filter: { term: { https: true } } },
          },
        ],
      });
      expect((await es.count({ index: 'myAlias' })).count).to.be(3);
      expect((await es.count({ index: 'wildcardAlias' })).count).to.be(3);
      expect((await es.count({ index: 'myHttpsAlias' })).count).to.be(2);

      // Reindex
      await supertest
        .post(`/api/upgrade_assistant/reindex/dummydata`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const lastState = await waitForReindexToComplete('dummydata');

      // The regular aliases should still return 3 docs
      expect((await es.count({ index: 'myAlias' })).count).to.be(3);
      expect((await es.count({ index: 'wildcardAlias' })).count).to.be(3);
      // The filtered alias should still return 2 docs
      expect((await es.count({ index: 'myHttpsAlias' })).count).to.be(2);

      // Cleanup newly created index
      await es.indices.delete({
        index: lastState.newIndexName,
      });
    });

    it('shows reindex and read-only warnings', async () => {
      const resp = await supertest.get(`/api/upgrade_assistant/reindex/reindexed-v7-6.0-data`); // reusing the index previously migrated in v7->v8 UA tests
      expect(resp.body.warnings.length).to.be(2);
      // By default, all reindexing operations will replace an index with an alias (with the same name)
      // pointing to a newly created "reindexed" index.
      expect(sortBy(resp.body.warnings, 'warningType')).to.eql([
        { warningType: 'makeIndexReadonly', flow: 'readonly' },
        { warningType: 'replaceIndexWithAlias', flow: 'reindex' },
      ]);
    });

    it('reindexes old 7.0 index', async () => {
      const { body } = await supertest
        .post(`/api/upgrade_assistant/reindex/reindexed-v7-6.0-data`) // reusing the index previously migrated in v7->v8 UA tests
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.indexName).to.equal('reindexed-v7-6.0-data');
      expect(body.status).to.equal(ReindexStatus.inProgress);

      const lastState = await waitForReindexToComplete('reindexed-v7-6.0-data');
      expect(lastState.errorMessage).to.equal(null);
      expect(lastState.status).to.equal(ReindexStatus.completed);
    });

    // todo
    it.skip('should reindex a batch in order and report queue state', async () => {
      const assertQueueState = async (
        firstInQueueIndexName: string | undefined,
        queueLength: number
      ) => {
        const response = await supertest
          .get(`/api/upgrade_assistant/reindex/batch/queue`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const { queue } = response.body;

        const [firstInQueue] = queue;

        if (!firstInQueueIndexName) {
          expect(firstInQueueIndexName).to.be(undefined);
        } else {
          expect(firstInQueue.indexName).to.be(firstInQueueIndexName);
        }

        expect(queue.length).to.be(queueLength);
      };

      const test1 = 'batch-reindex-test1';
      const test2 = 'batch-reindex-test2';
      const test3 = 'batch-reindex-test3';

      const cleanupReindex = async (indexName: string) => {
        try {
          // await es.indices.delete({ index: generateNewIndexName(indexName, versionService) });
        } catch (e) {
          try {
            await es.indices.delete({ index: indexName });
          } catch (_err) {
            // Ignore
          }
        }
      };

      try {
        // Set up indices for the batch
        await es.indices.create({ index: test1 });
        await es.indices.create({ index: test2 });
        await es.indices.create({ index: test3 });

        await es.indices.close({ index: test1 });

        const result = await supertest
          .post(`/api/upgrade_assistant/reindex/batch`)
          .set('kbn-xsrf', 'xxx')
          .send({ indexNames: [test1, test2, test3] })
          .expect(200);

        expect(result.body.enqueued.length).to.equal(3);
        expect(result.body.errors.length).to.equal(0);

        const [{ newIndexName: nameOfIndexThatShouldBeClosed }] = result.body.enqueued;

        await assertQueueState(test1, 3);
        await waitForReindexToComplete(test1);

        await assertQueueState(test2, 2);
        await waitForReindexToComplete(test2);

        await assertQueueState(test3, 1);
        await waitForReindexToComplete(test3);

        await assertQueueState(undefined, 0);

        // Check that the closed index is still closed after reindexing
        const resolvedIndices = await es.indices.resolveIndex({
          name: nameOfIndexThatShouldBeClosed,
        });

        const test1ReindexedState = getIndexState(
          nameOfIndexThatShouldBeClosed,
          resolvedIndices as ResolveIndexResponseFromES
        );
        expect(test1ReindexedState).to.be('closed');
      } finally {
        await cleanupReindex(test1);
        await cleanupReindex(test2);
        await cleanupReindex(test3);
      }
    });
  });
}
