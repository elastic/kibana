/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .send({ force: true })
      .set('kbn-xsrf', 'xxxx');
  };

  describe('packages/_bulk_upgrade', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Validations', () => {
      it('should not allow to create a _bulk_upgrade with non-installed packages', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: [{ name: 'idonotexists' }] })
          .expect(400);

        expect(res.body.message).equal('Cannot upgrade non-installed packages: idonotexists');
      });
    });

    describe('Success upgrade', () => {
      const POLICIES_IDS = ['multiple-versions-1', 'multiple-versions-2'];
      beforeEach(async () => {
        await installPackage('multiple_versions', '0.1.0');
        // Create package policies
        for (const id of POLICIES_IDS) {
          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              id,
              policy_ids: [],
              package: {
                name: 'multiple_versions',
                version: '0.1.0',
              },
              name: id,
              description: '',
              namespace: '',
              inputs: {},
            })
            .expect(200);
        }
      });

      afterEach(async () => {
        await deletePackage('multiple_versions', '0.2.0');
        for (const id of POLICIES_IDS) {
          await supertest
            .delete(`/api/fleet/package_policies/${id}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
        }
      });

      async function assertPackagePoliciesVersion(expectedVersion: string) {
        for (const id of POLICIES_IDS) {
          const res = await supertest
            .get(`/api/fleet/package_policies/${id}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);

          expect(res.body.item.package.version).equal(expectedVersion);
        }
      }

      async function assetPackageInstallVersion(expectedVersion: string) {
        const res = await supertest
          .get(`/api/fleet/epm/packages/multiple_versions`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.body.item.installationInfo.version).equal(expectedVersion);
      }

      it('should allow to create a _bulk_upgrade with installed packages that will succeed', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packages: [{ name: 'multiple_versions', version: '0.2.0' }],
            force: true,
            prerelease: true,
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
            await assetPackageInstallVersion('0.2.0');
            await assertPackagePoliciesVersion('0.1.0');
            return;
          }

          lastPollResult = JSON.stringify(pollRes.body);
        }

        throw new Error(`bulk upgrade of "multiple_versions" never succeed: ${lastPollResult}`);
      });

      it('should upgrade related policies if upgrade_package_policies:true', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packages: [{ name: 'multiple_versions', version: '0.2.0' }],
            prerelease: true,
            force: true,
            upgrade_package_policies: true,
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
            await assertPackagePoliciesVersion('0.2.0');
            await assetPackageInstallVersion('0.2.0');
            return;
          }

          lastPollResult = JSON.stringify(pollRes.body);
        }

        throw new Error(`bulk upgrade of "multiple_versions" never succeed: ${lastPollResult}`);
      });
    });

    describe('Failed upgrade', () => {
      const goodPackageVersion = '0.1.0';
      const badPackageVersion = '0.2.0';
      beforeEach(async () => {
        await installPackage('error_handling', goodPackageVersion);
      });

      afterEach(async () => {
        await deletePackage('error_handling', goodPackageVersion);
      });

      it('should allow to create a _bulk_upgrade with installed packages that will fail', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: [{ name: 'error_handling', version: badPackageVersion }] })
          .expect(200);

        const maxTimeout = Date.now() + 60 * 1000;
        let lastPollResult: string = '';
        while (Date.now() < maxTimeout) {
          const pollRes = await supertest
            .get(`/api/fleet/epm/packages/_bulk_upgrade/${res.body.taskId}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (pollRes.body.status === 'failed') {
            return;
          }

          lastPollResult = JSON.stringify(pollRes.body);
        }

        throw new Error(`bulk upgrade of "multiple_versions" never failed: ${lastPollResult}`);
      });
    });
  });
}
