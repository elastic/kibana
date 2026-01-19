/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { registerHelpers as registerPoliciesHelpers } from './policies.helpers';
import { registerHelpers as registerIndexHelpers } from './indices.helpers';
import { registerSnapshotPoliciesHelpers } from './snapshot_policies.helpers';
import { registerSnapshotRepositoriesHelpers } from './snapshot_repositories.helpers';

import { getPolicyPayload, getPolicyPayloadWithSearchableSnapshots } from './fixtures';
import { initElasticsearchHelpers, getPolicyNames } from './lib';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const {
    createIndex,
    createComposableIndexTemplate,
    createDataStream,
    cleanUp: cleanUpEsResources,
  } = initElasticsearchHelpers(getService);

  const {
    loadPolicies,
    createPolicy,
    deletePolicy,
    cleanUp: cleanUpPolicies,
  } = registerPoliciesHelpers({ supertest });

  const { addPolicyToIndex } = registerIndexHelpers({ supertest });

  const { createSnapshotPolicy, cleanupPolicies: cleanupSnapshotPolicies } =
    registerSnapshotPoliciesHelpers(getService);
  const { createSnapshotRepository, cleanupRepositories } =
    registerSnapshotRepositoriesHelpers(getService);

  describe('policies', () => {
    after(() => Promise.all([cleanUpEsResources(), cleanUpPolicies()]));

    describe('list', () => {
      it('should add the indices linked to the policies', async () => {
        // Create a policy
        const policy = getPolicyPayload('link-test-policy');
        const { name: policyName } = policy;

        const { statusCode } = await createPolicy(policy);
        expect(statusCode).to.eql(200);

        // Create a new index
        const indexName = await createIndex();

        await addPolicyToIndex(policyName, indexName);

        const { body } = await loadPolicies(true);
        const fetchedPolicy = body.find((p) => p.name === policyName);
        expect(fetchedPolicy.indices).to.eql([indexName]);
      });

      it('should add hidden indices linked to policies', async () => {
        // Create a policy
        const policy = getPolicyPayload('hidden-index-link-test-policy');
        const { name: policyName } = policy;
        await createPolicy(policy);

        // Create hidden data stream
        await createComposableIndexTemplate('my_template', {
          template: {},
          index_patterns: ['hidden*'],
          data_stream: {
            hidden: true,
          },
        });

        const indexName = 'hidden_index';
        await createDataStream(indexName, {
          '@timestamp': '2020-01-27',
        });

        await addPolicyToIndex(policyName, indexName);

        const { body } = await loadPolicies(true);
        const fetchedPolicy = body.find((p) => p.name === policyName);
        // The index name is dynamically generated as .ds-<indexName>-XXX so we don't check for exact match
        expect(fetchedPolicy.indices[0]).to.contain(indexName);
      });
    });

    describe('create', () => {
      it('should create a lifecycle policy', async () => {
        const policy = getPolicyPayload('create-test-policy');
        const { name } = policy;

        // Load current policies
        const { body: bodyFirstLoad } = await loadPolicies();
        expect(getPolicyNames(bodyFirstLoad)).not.to.contain(name);

        // Create new policy
        await createPolicy(policy).expect(200);

        // Make sure the new policy is returned
        const { body: bodySecondLoad } = await loadPolicies();
        expect(getPolicyNames(bodySecondLoad)).to.contain(name);
      });
    });

    describe('searchable snapshots', function () {
      this.tags(['skipCloud']); // file system repositories are not supported in cloud

      before(async () => {
        try {
          await createSnapshotRepository('backing_repo'); // This corresponds to the name set in the ILM policy
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating repository');
          throw err;
        }

        try {
          await createSnapshotPolicy('policy', 'backing_repo'); // Policy name corresponds to the policy name specified in the ILM policy
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating SLM policy');
          throw err;
        }
      });

      after(async () => Promise.all([cleanupRepositories(), cleanupSnapshotPolicies()]));

      it('should create a lifecycle policy with searchable snapshot action', async () => {
        const policy = getPolicyPayloadWithSearchableSnapshots('create-searchable-snapshot-policy');
        const { name } = policy;

        // Load current policies
        const { body: bodyFirstLoad } = await loadPolicies();
        expect(getPolicyNames(bodyFirstLoad)).not.to.contain(name);

        // Create new policy
        await createPolicy(policy).expect(200);

        // Make sure the new policy is returned
        const { body: bodySecondLoad } = await loadPolicies();
        expect(getPolicyNames(bodySecondLoad)).to.contain(name);
      });
    });

    describe('edit', () => {
      it('keeps _meta field intact', async () => {
        const policyName = 'edit-meta-test-policy';
        const policy = {
          ...getPolicyPayload(policyName),
          _meta: { description: 'test policy with _meta field' },
        };

        // Update the policy (uses the same route as create)
        await createPolicy(policy).expect(200);

        // only update warm phase timing, not deleting or changing _meta field
        const editedPolicy = {
          ...policy,
          phases: {
            ...policy.phases,
            warm: {
              ...policy.phases.warm,
              min_age: '2d',
            },
          },
        };

        await createPolicy(editedPolicy).expect(200);

        const { body } = await loadPolicies();
        const loadedPolicy = body.find((p) => p.name === policyName);
        // Make sure the edited policy still has _meta field
        expect(loadedPolicy.policy._meta).to.eql(editedPolicy._meta);
      });
    });

    describe('delete', () => {
      it('should delete the policy created', async () => {
        const policy = getPolicyPayload('delete-test-policy');
        const { name } = policy;

        // Create new policy
        await createPolicy(policy);

        const { body: bodyFirstLoad } = await loadPolicies();
        expect(getPolicyNames(bodyFirstLoad)).to.contain(name);

        // Delete the policy
        await deletePolicy(name).expect(200);

        // Load current policies
        const { body: bodySecondLoad } = await loadPolicies();
        expect(getPolicyNames(bodySecondLoad)).not.to.contain(name);
      });
    });
  });
}
