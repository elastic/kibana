/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  PACKAGES_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const supertest = getService('supertest');

  async function installPackage(pkgName: string, pkgVersion: string) {
    await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  }

  async function createPackagePolicies(
    policyIds: string[],
    pkgName: string,
    pkgVersion: string,
    inputs = {}
  ) {
    for (const id of policyIds) {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id,
          policy_ids: [],
          package: {
            name: pkgName,
            version: pkgVersion,
          },
          name: id,
          description: '',
          namespace: 'default',
          inputs,
        })
        .expect(200);
    }
  }

  async function assertPackagePoliciesVersion(policyIds: string[], expectedVersion: string) {
    for (const id of policyIds) {
      const res = await supertest
        .get(`/api/fleet/package_policies/${id}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(res.body.item.package.version).equal(expectedVersion);
    }
  }

  async function assertPackageInstallVersion(pkgName: string, expectedVersion: string) {
    const res = await supertest
      .get(`/api/fleet/epm/packages/${pkgName}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    expect(res.body.item.installationInfo.version).equal(expectedVersion);
  }

  async function upgradePackage(
    pkgName: string,
    oldPkgVersion: string,
    newPkgVersion: string,
    policyIds: string[],
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
        await assertPackageInstallVersion(pkgName, newPkgVersion);
        await assertPackagePoliciesVersion(
          policyIds,
          upgradePackagePolicies ? newPkgVersion : oldPkgVersion
        );
        return;
      }

      lastPollResult = JSON.stringify(pollRes.body);
    }
    throw new Error(`bulk upgrade of ${pkgName} failed: ${lastPollResult}`);
  }

  async function deletePackage(pkgName: string, pkgVersion: string) {
    await supertest
      .delete(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx');
  }

  async function deletePackagePolicies(policyIds: string[]) {
    for (const id of policyIds) {
      await supertest
        .delete(`/api/fleet/package_policies/${id}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    }
  }

  describe('Cleanup previous integration revisions', () => {
    const pkgName = 'multiple_versions';
    const oldPkgVersion = '0.1.0';
    const newPkgVersion = '0.2.0';
    const policyIds = [`${pkgName}-1`, `${pkgName}-2`];
    const TASK_INTERVAL = 31000; // as set in the config
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    async function waitForTask() {
      // Sleep for the duration of the task interval.
      // In case of test flakiness, the sleep duration can be increased.
      await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL));
    }

    beforeEach(async () => {
      await installPackage(pkgName, oldPkgVersion);
      await createPackagePolicies(policyIds, pkgName, oldPkgVersion, {});
    });

    afterEach(async () => {
      await deletePackage(pkgName, newPkgVersion);
      await deletePackagePolicies(policyIds);
    });

    it('should succeed when the package and its policies have matching previous versions', async () => {
      await upgradePackage(pkgName, oldPkgVersion, newPkgVersion, policyIds, true);

      // Verify saved objects before the cleanup
      const packagePolicySORes = await kibanaServer.savedObjects.find({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
      expect(packagePolicySORes.saved_objects.map((so) => so.id).sort()).to.eql([
        `${pkgName}-1`,
        `${pkgName}-1:prev`,
        `${pkgName}-2`,
        `${pkgName}-2:prev`,
      ]);

      const packageSOres = await kibanaServer.savedObjects.get({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        id: pkgName,
      });
      expect(packageSOres.attributes.previous_version).to.eql(oldPkgVersion);

      await waitForTask();

      const packagePolicySOResAfterCleanup = await kibanaServer.savedObjects.find({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
      expect(packagePolicySOResAfterCleanup.saved_objects.map((so) => so.id).sort()).to.eql([
        `${pkgName}-1`,
        `${pkgName}-2`,
      ]);
      const packageSOresAfterCleanup = await kibanaServer.savedObjects.get({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        id: pkgName,
      });
      expect(packageSOresAfterCleanup.attributes.previous_version).to.eql(null);
    });
  });
}
