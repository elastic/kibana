/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FOLLOWER_INDEX_ADVANCED_SETTINGS } from '@kbn/cross-cluster-replication-plugin/common/constants';
import { getFollowerIndexPayload } from './fixtures';
import { registerHelpers as registerElasticSearchHelpers } from './lib';
import { registerHelpers as registerRemoteClustersHelpers } from './remote_clusters.helpers';
import { registerHelpers as registerFollowerIndicesnHelpers } from './follower_indices.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { addCluster, deleteAllClusters } = registerRemoteClustersHelpers(supertest);
  const {
    loadFollowerIndices,
    getFollowerIndex,
    createFollowerIndex,
    updateFollowerIndex,
    unfollowAll,
  } = registerFollowerIndicesnHelpers(supertest);

  const { createIndex, deleteAllIndices } = registerElasticSearchHelpers(getService);

  describe('follower indices', function () {
    this.tags(['skipCloud']);

    before(() => addCluster());

    after(() => Promise.all([deleteAllIndices(), unfollowAll().then(deleteAllClusters)]));

    describe('list()', () => {
      it('should return an empty array when there are no follower indices', async () => {
        const { body } = await loadFollowerIndices().expect(200);

        expect(body).to.eql({ indices: [] });
      });
    });

    describe('create()', () => {
      it('should throw a 404 error when cluster is unknown', async () => {
        const payload = getFollowerIndexPayload();
        payload.remoteCluster = 'unknown-cluster';

        const { body } = await createFollowerIndex('test', payload).expect(404);
        expect(body.attributes.error.reason).to.contain('no such remote cluster');
      });

      it('should throw a 404 error trying to follow an unknown index', async () => {
        const payload = getFollowerIndexPayload();
        const { body } = await createFollowerIndex('test', payload).expect(404);
        expect(body.attributes.error.reason).to.contain('no such index');
      });

      // NOTE: If this test fails locally it's probably because you have another cluster running.
      it('should create a follower index that follows an existing leader index', async () => {
        // First let's create an index to follow
        const leaderIndex = await createIndex('leader1');

        const payload = getFollowerIndexPayload(leaderIndex);
        const { body } = await createFollowerIndex('index1', payload).expect(200);

        // There is a race condition in which Elasticsearch can respond without acknowledging,
        // i.e. `body.follow_index_shards_acked` is sometimes true and sometimes false.
        // By only asserting that `follow_index_created` is true, we eliminate this flakiness.
        expect(body.follow_index_created).to.eql(true);
      });
    });

    describe('get()', () => {
      it('should return a 404 when the follower index does not exist', async () => {
        const name = 'test';
        const { body } = await getFollowerIndex(name).expect(404);

        expect(body.attributes.error.reason).to.contain('no such index');
      });

      // NOTE: If this test fails locally it's probably because you have another cluster running.
      it('should return a follower index that was created', async () => {
        const leaderIndex = await createIndex('leader2');

        const name = 'index2';
        const payload = getFollowerIndexPayload(leaderIndex);
        await createFollowerIndex(name, payload);

        const { body } = await getFollowerIndex(name).expect(200);

        expect(body.leaderIndex).to.eql(leaderIndex);
        expect(body.remoteCluster).to.eql(payload.remoteCluster);
      });
    });

    describe('update()', () => {
      it('should update a follower index advanced settings', async () => {
        // Create a follower index
        const leaderIndex = await createIndex('leader3');
        const followerIndex = 'index3';
        const initialValue = 1234;
        const payload = getFollowerIndexPayload(leaderIndex, undefined, {
          maxReadRequestOperationCount: initialValue,
        });
        await createFollowerIndex(followerIndex, payload);

        // Verify that its advanced settings are correctly set
        const { body } = await getFollowerIndex(followerIndex, true);
        expect(body.maxReadRequestOperationCount).to.be(initialValue);

        // Update the follower index
        const updatedValue = 7777;
        await updateFollowerIndex(followerIndex, { maxReadRequestOperationCount: updatedValue });

        // Verify that the advanced settings are updated
        const { body: updatedBody } = await getFollowerIndex(followerIndex, true);
        expect(updatedBody.maxReadRequestOperationCount).to.be(updatedValue);
      });
    });

    describe('Advanced settings', () => {
      it('hard-coded values should match Elasticsearch default values', async () => {
        /**
         * To make sure that the hard-coded values in the client match the default
         * from Elasticsearch, we will create a follower index without any advanced settings.
         * When we then retrieve the follower index it will have all the advanced settings
         * coming from ES. We can then compare those settings with our hard-coded values.
         */
        const leaderIndex = await createIndex('leader4');
        const name = 'index4';
        const payload = getFollowerIndexPayload(leaderIndex);
        await createFollowerIndex(name, payload);

        const { body } = await getFollowerIndex(name);

        // We "only" check the settings if the follower index is in "active" state.
        // It can happen that a race condition returns the index as "paused". In this case
        // no advanced settings value is returned by ES.
        if (body.status !== 'active') {
          return;
        }

        Object.entries(FOLLOWER_INDEX_ADVANCED_SETTINGS).forEach(([key, value]) => {
          expect(value).to.eql(body[key]);
        });
      });
    });
  });
}
