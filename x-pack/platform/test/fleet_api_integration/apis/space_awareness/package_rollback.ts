/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, createTestSpace } from './helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('package rollback', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClientDefaultSpace = new SpaceTestApiClient(supertestWithoutAuth, {
      username: testUsers.fleet_all_int_all_default_space_only.username,
      password: testUsers.fleet_all_int_all_default_space_only.password,
    });
    const apiClientAllSpaces = new SpaceTestApiClient(supertestWithoutAuth, {
      username: testUsers.fleet_all_int_all.username,
      password: testUsers.fleet_all_int_all.password,
    });
    before(async () => {
      await setupTestUsers(getService('security'), true);
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClientDefaultSpace.postEnableSpaceAwareness();

      await createTestSpace(providerContext, TEST_SPACE_1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    const packagePolicyId = 'multiple-versions-1';
    const policyIdInOtherSpace = 'multiple-versions-3';

    beforeEach(async () => {
      await apiClientDefaultSpace.installPackage({
        pkgName: 'multiple_versions',
        force: true,
        pkgVersion: '0.1.0',
      });
      // Create package policies
      await apiClientDefaultSpace.createPackagePolicy(undefined, {
        id: packagePolicyId,
        policy_ids: [],
        package: {
          name: 'multiple_versions',
          version: '0.1.0',
        },
        name: packagePolicyId,
        description: '',
        namespace: '',
        inputs: {},
      });

      await apiClientAllSpaces.createPackagePolicy(TEST_SPACE_1, {
        id: policyIdInOtherSpace,
        policy_ids: [],
        package: {
          name: 'multiple_versions',
          version: '0.1.0',
        },
        name: policyIdInOtherSpace,
        description: '',
        namespace: '',
        inputs: {},
      });
    });

    afterEach(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/multiple_versions/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      await apiClientDefaultSpace.deletePackagePolicy(packagePolicyId);
      await apiClientDefaultSpace.deletePackagePolicy(policyIdInOtherSpace);
    });

    async function assertPackagePoliciesVersion(expectedVersion: string) {
      const res = await supertest
        .get(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      expect(res.body.item.package.version).equal(expectedVersion);
    }

    async function assertPackageInstallVersion(expectedVersion: string) {
      const res = await supertest
        .get(`/api/fleet/epm/packages/multiple_versions`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(res.body.item.installationInfo.version).equal(expectedVersion);
    }

    async function upgradePackage(
      pkgName: string,
      oldPkgVersion: string,
      newPkgVersion: string,
      upgradePackagePolicies: boolean
    ) {
      const res = await supertest
        .post(`/api/fleet/epm/packages/_bulk_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          packages: [{ name: pkgName, version: newPkgVersion }],
          prerelease: true,
          force: true,
          upgrade_package_policies: upgradePackagePolicies,
        })
        .expect(200);
      const maxTimeout = Date.now() + 60 * 1000;
      let lastPollResult: string = '';
      while (Date.now() < maxTimeout) {
        const pollRes = await supertest
          .get(`/api/fleet/epm/packages/_bulk_upgrade/${res.body.taskId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (pollRes.body.status === 'success') {
          await assertPackageInstallVersion(newPkgVersion);
          await assertPackagePoliciesVersion(
            upgradePackagePolicies ? newPkgVersion : oldPkgVersion
          );
          return;
        }

        lastPollResult = JSON.stringify(pollRes.body);
      }
      throw new Error(`bulk upgrade of ${pkgName} failed: ${lastPollResult}`);
    }

    async function verifyBulkRollbackFailedResult(taskId: string) {
      const maxTimeout = Date.now() + 60 * 1000;
      let lastPollResult: string = '';
      while (Date.now() < maxTimeout) {
        const pollRes = await supertestWithoutAuth
          .get(`/api/fleet/epm/packages/_bulk_rollback/${taskId}`)
          .auth(
            testUsers.fleet_all_int_all_default_space_only.username,
            testUsers.fleet_all_int_all_default_space_only.password
          )
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (pollRes.body.status === 'failed') {
          await assertPackageInstallVersion('0.2.0');
          await assertPackagePoliciesVersion('0.2.0');
          expect(pollRes.body.results[0].error.message).to.equal(
            'Not authorized to rollback integration policies in all spaces'
          );
          return;
        }

        lastPollResult = JSON.stringify(pollRes.body);
      }

      throw new Error(`bulk rollback of "multiple_versions" succeeded: ${lastPollResult}`);
    }

    it('should fail _bulk_rollback if not allowed to update package policies in all spaces', async () => {
      await upgradePackage('multiple_versions', '0.1.0', '0.2.0', true);
      await apiClientAllSpaces.upgradePackagePolicies(TEST_SPACE_1, [policyIdInOtherSpace]);

      const res = await supertestWithoutAuth
        .post(`/api/fleet/epm/packages/_bulk_rollback`)
        .auth(
          testUsers.fleet_all_int_all_default_space_only.username,
          testUsers.fleet_all_int_all_default_space_only.password
        )
        .set('kbn-xsrf', 'xxxx')
        .send({
          packages: [{ name: 'multiple_versions' }],
        })
        .expect(200);

      await verifyBulkRollbackFailedResult(res.body.taskId);

      // Verify rollback succeeds if user has permissions in all spaces
      await apiClientAllSpaces.rollbackPackage({ pkgName: 'multiple_versions' });

      await assertPackageInstallVersion('0.1.0');
      await assertPackagePoliciesVersion('0.1.0');
    });
  });
}
