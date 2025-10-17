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

  function assertPackageRollback(
    pkgName: string,
    type: string,
    oldPkgVersion: string,
    newPkgVersion: string,
    latestPkgVersion: string
  ) {
    describe(`${type} package`, () => {
      const policyIds = [`${pkgName}-1`, `${pkgName}-2`];

      beforeEach(async () => {
        await installPackage(pkgName, oldPkgVersion);
        const inputs =
          type === 'input'
            ? {
                'logs-logfile': {
                  enabled: true,
                  streams: {
                    'input_package_upgrade.logs': {
                      enabled: true,
                      vars: {
                        paths: ['/tmp/test/log'],
                        tags: ['tag1'],
                        ignore_older: '72h',
                        'data_stream.dataset': `dataset`,
                      },
                    },
                  },
                },
              }
            : {};
        await createPackagePolicies(policyIds, pkgName, oldPkgVersion, inputs);
      });

      afterEach(async () => {
        await deletePackage(pkgName, newPkgVersion);
        await deletePackagePolicies(policyIds);
      });

      it('should fail when attempting to rollback a non installed package', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/system/rollback`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
        expect(res.body.message).to.eql(
          'Failed to roll back package system: Package system not found'
        );
      });

      it('should fail when the package does not have a previous version', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/rollback`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
        expect(res.body.message).to.eql(
          `Failed to roll back package ${pkgName}: No previous version found for package ${pkgName}`
        );
      });

      it('should fail when at least one package policy does not have a previous revision', async () => {
        await upgradePackage(pkgName, oldPkgVersion, newPkgVersion, policyIds, false);
        const res = await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/rollback`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
        // Cannot predict order of SO creation.
        const re = new RegExp(
          `Failed to roll back package ${pkgName}: No previous version found for package policies: ${pkgName}-[1-2], ${pkgName}-[1-2]`,
          'g'
        );
        expect(res.body.message).to.match(re);
      });

      it('should fail when at least one package policy has a previous revision with a different version', async () => {
        await upgradePackage(pkgName, oldPkgVersion, newPkgVersion, policyIds, false);
        await upgradePackage(pkgName, newPkgVersion, latestPkgVersion, policyIds, true);
        const res = await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/rollback`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
        // Cannot predict order of SO creation.
        const errorMsg = String.raw`${pkgName}-[1-2] \(version: ${oldPkgVersion}, expected: ${newPkgVersion}\)`;
        const re = new RegExp(
          `Failed to roll back package ${pkgName}: Wrong previous version for package policies: ${errorMsg}, ${errorMsg}`,
          'g'
        );
        expect(res.body.message).to.match(re);
      });

      it('should succeed when the package and its policies have matching previous versions', async () => {
        await upgradePackage(pkgName, oldPkgVersion, newPkgVersion, policyIds, true);

        // Verify saved objects pre-rollback.
        const packageSOres = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        expect(packageSOres.attributes.version).to.eql(newPkgVersion);
        expect(packageSOres.attributes.previous_version).to.eql(oldPkgVersion);
        const packagePolicySORes = await kibanaServer.savedObjects.find({
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
        // Cannot predict order of SO creation.
        expect(packagePolicySORes.saved_objects.map((so) => so.id).sort()).to.eql([
          `${pkgName}-1`,
          `${pkgName}-1:prev`,
          `${pkgName}-2`,
          `${pkgName}-2:prev`,
        ]);
        expect(
          packagePolicySORes.saved_objects.find((so) => so.id === `${pkgName}-1`)?.attributes
            .package.version
        ).to.eql(newPkgVersion);
        expect(
          packagePolicySORes.saved_objects.find((so) => so.id === `${pkgName}-2`)?.attributes
            .package.version
        ).to.eql(newPkgVersion);
        expect(
          packagePolicySORes.saved_objects.find((so) => so.id === `${pkgName}-1:prev`)?.attributes
            .package.version
        ).to.eql(oldPkgVersion);
        expect(
          packagePolicySORes.saved_objects.find((so) => so.id === `${pkgName}-2:prev`)?.attributes
            .package.version
        ).to.eql(oldPkgVersion);

        await assertPackageInstallVersion(pkgName, newPkgVersion);
        await assertPackagePoliciesVersion(policyIds, newPkgVersion);

        // Verify rollback succeeds.
        await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/rollback`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        await assertPackageInstallVersion(pkgName, oldPkgVersion);
        await assertPackagePoliciesVersion(policyIds, oldPkgVersion);
      });
    });
  }

  describe('Package rollback', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    assertPackageRollback('multiple_versions', 'integration', '0.1.0', '0.2.0', '0.3.0');
    assertPackageRollback('input_package_upgrade', 'input', '1.0.0', '1.1.0', '1.2.0');
  });
}
