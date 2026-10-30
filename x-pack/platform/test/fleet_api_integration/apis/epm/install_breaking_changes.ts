/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

const PKG_NAME = 'breaking_changes_upgrade';
const POLICY_ID = 'breaking-changes-upgrade-1';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');

  const installPackage = (version: string, body: Record<string, unknown> = {}) =>
    supertest
      .post(`/api/fleet/epm/packages/${PKG_NAME}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ allow_outdated_version: true, ...body });

  const deletePackage = async () => {
    const res = await supertest.get(`/api/fleet/epm/packages/${PKG_NAME}`).expect(200);
    const installedVersion = res.body.item.installationInfo?.version;
    if (installedVersion) {
      await supertest
        .delete(`/api/fleet/epm/packages/${PKG_NAME}/${installedVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    }
  };

  const expectInstalledVersion = async (expectedVersion: string) => {
    const res = await supertest.get(`/api/fleet/epm/packages/${PKG_NAME}`).expect(200);
    expect(res.body.item.installationInfo.version).equal(expectedVersion);
  };

  const expectPackagePolicyVersion = async (expectedVersion: string) => {
    const res = await supertest.get(`/api/fleet/package_policies/${POLICY_ID}`).expect(200);
    expect(res.body.item.package.version).equal(expectedVersion);
  };

  const expectBreakingChangesError = (body: any) => {
    expect(body.attributes.type).equal('breaking_changes_not_acknowledged');
    expect(body.attributes.breaking_changes.map((entry: any) => entry.version)).eql(['2.0.0']);
    expect(body.message).contain('Remove the test input.');
    expect(body.message).contain('Settings tab');
  };

  describe('upgrading packages with breaking changes', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('package install', () => {
      beforeEach(async () => {
        await installPackage('1.0.0').expect(200);
      });

      afterEach(async () => {
        await deletePackage();
      });

      it('should reject an upgrade with breaking changes and leave the package unchanged', async () => {
        const res = await installPackage('2.0.0').expect(400);

        expectBreakingChangesError(res.body);
        await expectInstalledVersion('1.0.0');
      });

      it('should reject an upgrade with breaking changes when using force', async () => {
        const res = await installPackage('2.0.0', { force: true }).expect(400);

        expectBreakingChangesError(res.body);
        await expectInstalledVersion('1.0.0');
      });

      it('should allow an upgrade without breaking changes', async () => {
        await installPackage('1.1.0').expect(200);

        await expectInstalledVersion('1.1.0');
      });

      it('should allow an upgrade with acknowledged breaking changes', async () => {
        await installPackage('2.0.0', { acknowledge_breaking_changes: true }).expect(200);

        await expectInstalledVersion('2.0.0');
      });

      it('should report the rejection per package in a bulk install', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: [{ name: PKG_NAME, version: '2.0.0' }] })
          .expect(200);

        expect(res.body.items).length(1);
        expect(res.body.items[0].name).equal(PKG_NAME);
        expect(res.body.items[0].statusCode).equal(400);
        expect(res.body.items[0].error).contain('includes breaking changes');
        await expectInstalledVersion('1.0.0');
      });

      it('should allow a bulk install with acknowledged breaking changes', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packages: [{ name: PKG_NAME, version: '2.0.0' }],
            acknowledge_breaking_changes: true,
          })
          .expect(200);

        expect(res.body.items[0].statusCode).to.be(undefined);
        await expectInstalledVersion('2.0.0');
      });

      it('should report the rejection per package in a bulk upgrade', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: [{ name: PKG_NAME, version: '2.0.0' }] })
          .expect(200);

        const maxTimeout = Date.now() + 60 * 1000;
        let lastPollResult: string = '';
        while (Date.now() < maxTimeout) {
          const pollRes = await supertest
            .get(`/api/fleet/epm/packages/_bulk_upgrade/${res.body.taskId}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);

          if (pollRes.body.status === 'failed') {
            expect(pollRes.body.results).length(1);
            expect(pollRes.body.results[0].success).equal(false);
            expect(pollRes.body.results[0].error.message).contain('includes breaking changes');
            await expectInstalledVersion('1.0.0');
            return;
          }

          lastPollResult = JSON.stringify(pollRes.body);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        throw new Error(`bulk upgrade of "${PKG_NAME}" never failed: ${lastPollResult}`);
      });
    });

    describe('package policy upgrade', () => {
      before(async () => {
        await installPackage('1.0.0').expect(200);
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: POLICY_ID,
            policy_ids: [],
            package: { name: PKG_NAME, version: '1.0.0' },
            name: POLICY_ID,
            description: '',
            namespace: '',
            inputs: {},
          })
          .expect(200);
        await installPackage('2.0.0', { acknowledge_breaking_changes: true }).expect(200);
      });

      after(async () => {
        await supertest
          .delete(`/api/fleet/package_policies/${POLICY_ID}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        await deletePackage();
      });

      it('should reject a package policy upgrade with breaking changes and leave the policy unchanged', async () => {
        const res = await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [POLICY_ID] })
          .expect(400);

        expectBreakingChangesError(res.body);
        expect(res.body.message).contain(`Package policy ${POLICY_ID}`);
        await expectPackagePolicyVersion('1.0.0');
      });

      it('should allow a package policy upgrade with acknowledged breaking changes', async () => {
        await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [POLICY_ID], acknowledge_breaking_changes: true })
          .expect(200);

        await expectPackagePolicyVersion('2.0.0');
      });
    });
  });
}
