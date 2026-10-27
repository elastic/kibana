/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import JSZip from 'jszip';
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');
  const retry = getService('retry');
  const security = getService('security');

  // The remediation is about a Space-scoped, non-superuser package manager, so uploads run as a
  // user holding only Fleet/Integrations privileges in the default Space and no Elasticsearch
  // index privileges at all. That is what makes the privileges check below meaningful.
  const uploader = testUsers.fleet_all_int_all_default_space_only;

  const pkgName = 'transform_identity_test';
  const pkgVersion = '1.0.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const transformModuleId = 'probe';
  const transformVersion = '1.0.0';
  const transformId = `logs-${pkgName}.${transformModuleId}-default-${transformVersion}`;
  // A second version with a bumped fleet_transform_version, which is what makes the installer
  // remove the previous transform rather than leave it in place.
  const upgradeVersion = '1.1.0';
  const upgradeTransformId = `logs-${pkgName}.${transformModuleId}-default-${upgradeVersion}`;
  // Legacy JSON specs are named `<pkg>.<folder>-<file>-<version>`; the folder is `transform`.
  const legacyTransformFile = 'legacy';
  const legacyTransformId = `${pkgName}.transform-${legacyTransformFile}-${pkgVersion}`;

  // `start: false` keeps the assertions on the created transform rather than on whether
  // Elasticsearch could start it against a source index this test never creates.
  const buildPackageZip = async ({
    sourceIndex,
    version = pkgVersion,
    transformPath,
    legacy = false,
  }: {
    sourceIndex: string;
    version?: string;
    transformPath?: string;
    // Ships the transform as a legacy JSON spec, which has no `_meta.run_as_kibana_system` switch.
    legacy?: boolean;
  }): Promise<Buffer> => {
    const key = `${pkgName}-${version}`;
    const path =
      transformPath ?? `${key}/elasticsearch/transform/${transformModuleId}/transform.yml`;
    const zip = new JSZip();
    zip.file(
      `${key}/manifest.yml`,
      [
        `name: ${pkgName}`,
        `title: Transform Install Identity Test`,
        `version: ${version}`,
        `description: Test package for uploaded transform identity`,
        `type: integration`,
        `format_version: 1.0.0`,
        `categories: []`,
        `conditions:`,
        `  kibana.version: "^8.0.0"`,
        `owner:`,
        `  github: elastic/fleet`,
      ].join('\n')
    );
    if (legacy) {
      zip.file(
        `${key}/elasticsearch/transform/${legacyTransformFile}.json`,
        JSON.stringify({
          source: { index: [sourceIndex] },
          dest: { index: `${pkgName}_dest` },
          latest: { unique_key: ['id'], sort: '@timestamp' },
          frequency: '1m',
        })
      );
      return await zip.generateAsync({ type: 'nodebuffer' });
    }
    zip.file(
      `${key}/elasticsearch/transform/${transformModuleId}/manifest.yml`,
      ['start: false'].join('\n')
    );
    zip.file(
      path,
      [
        `source:`,
        `  index: ["${sourceIndex}"]`,
        `dest:`,
        `  index: "${pkgName}_dest"`,
        `latest:`,
        `  unique_key: ["id"]`,
        `  sort: "@timestamp"`,
        `frequency: 1m`,
        `_meta:`,
        `  fleet_transform_version: ${version}`,
      ].join('\n')
    );
    return await zip.generateAsync({ type: 'nodebuffer' });
  };

  const uploadPackage = (buf: Buffer) =>
    supertestWithoutAuth
      .post(`/api/fleet/epm/packages`)
      .auth(uploader.username, uploader.password)
      .set('kbn-xsrf', 'xxxx')
      .type('application/zip')
      .send(buf);

  describe('Transform identity for uploaded packages', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
      // The second argument is required: setupTestUsers skips
      // fleet_all_int_all_default_space_only unless space awareness is requested, and without it
      // the uploader below does not exist and every upload 401s.
      await setupTestUsers(security, true);
    });

    // Wait until the process-wide upload rate-limit (10 s) has expired. The probe uses a
    // deliberately invalid zip so it always fails before setLastUploadInstallCache() is reached —
    // each probe leaves the slot unchanged. Needed before every upload, not just once per test,
    // because a successful upload consumes the slot for the next one.
    const waitForUploadSlot = async () => {
      const probe = Buffer.from('not-a-zip');
      await retry.tryForTime(15_000, async () => {
        const { status } = await supertest
          .post('/api/fleet/epm/packages')
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(probe);
        if (status === 429) {
          throw new Error('Upload rate limit still active');
        }
      });
    };

    beforeEach(async () => {
      await waitForUploadSlot();
    });

    afterEach(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx');
      await supertest
        .delete(`/api/fleet/epm/packages/${pkgName}/${upgradeVersion}`)
        .set('kbn-xsrf', 'xxxx');
      for (const id of [transformId, upgradeTransformId, legacyTransformId]) {
        await esClient.transform.deleteTransform(
          { transform_id: id, force: true },
          { ignore: [404] }
        );
      }
    });

    it('creates an uploaded transform with the installing user credentials, not kibana_system', async () => {
      const buf = await buildPackageZip({ sourceIndex: 'logs-transform_identity_test-*' });
      await uploadPackage(buf).expect(200);

      const { transforms } = await esClient.transform.getTransform({ transform_id: transformId });
      expect(transforms.length).to.be(1);

      // A transform created through the internal client carries kibana_system's roles. One
      // created with an es-secondary-authorization header carries the granted API key instead,
      // which is what confines an uploaded transform to the uploader's own privileges.
      const authorization = transforms[0].authorization as
        | { api_key?: { id: string; name: string }; roles?: string[] }
        | undefined;
      expect(authorization).to.be.an('object');
      expect(authorization?.api_key).to.be.an('object');
      expect(authorization?.roles).to.be(undefined);
      // Fleet names the granted key after the user it was granted for, so this pins the
      // transform to the uploader rather than to whoever happened to be privileged.
      expect(authorization?.api_key?.name).to.contain(uploader.username);

      // The uploader holds no Elasticsearch index privileges, so Elasticsearch refuses to run
      // the transform instead of it inheriting kibana_system's reach.
      const { transforms: stats } = await esClient.transform.getTransformStats({
        transform_id: transformId,
      });
      expect(stats[0].health?.status).to.be('red');

      // Persisted so the reauthorize flow stays caller-bound too.
      expect(
        (transforms[0]._meta as { run_as_kibana_system?: boolean })?.run_as_kibana_system
      ).to.be(false);
    });

    // Legacy JSON specs have no `_meta.run_as_kibana_system` switch and used to be created with
    // kibana_system unconditionally, so they are covered separately from the yml path.
    it('creates an uploaded legacy JSON transform with the installing user credentials', async () => {
      const buf = await buildPackageZip({
        sourceIndex: 'logs-transform_identity_test-*',
        legacy: true,
      });
      await uploadPackage(buf).expect(200);

      const { transforms } = await esClient.transform.getTransform({
        transform_id: legacyTransformId,
      });
      expect(transforms.length).to.be(1);

      const authorization = transforms[0].authorization as
        | { api_key?: { id: string; name: string }; roles?: string[] }
        | undefined;
      expect(authorization?.api_key).to.be.an('object');
      expect(authorization?.roles).to.be(undefined);
      expect(authorization?.api_key?.name).to.contain(uploader.username);
    });

    // Reauthorizing re-binds a transform to the caller. Allowing it for an uploaded package
    // would let a transform admin start a transform its uploader had no privileges to run,
    // undoing the binding above.
    it('refuses to reauthorize a transform from an uploaded package', async () => {
      const buf = await buildPackageZip({ sourceIndex: 'logs-transform_identity_test-*' });
      await uploadPackage(buf).expect(200);

      const res = await supertest
        .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}/transforms/authorize`)
        .set('kbn-xsrf', 'xxxx')
        .send({ transforms: [{ transformId }] })
        .expect(403);

      expect(res.body.message).to.contain('Cannot reauthorize transforms');

      // The transform is still bound to the uploader, not to the superuser that just called.
      const { transforms } = await esClient.transform.getTransform({ transform_id: transformId });
      const authorization = transforms[0].authorization as
        | { api_key?: { name: string }; roles?: string[] }
        | undefined;
      expect(authorization?.roles).to.be(undefined);
    });

    it('rejects an uploaded transform that targets a restricted index', async () => {
      const buf = await buildPackageZip({ sourceIndex: '.fleet-policies' });
      const res = await uploadPackage(buf).expect(400);

      expect(res.body.message).to.contain('targets the restricted index');

      // The upload is rejected before any transform is created.
      const { count } = await esClient.transform.getTransform({
        transform_id: `logs-${pkgName}.*`,
        allow_no_match: true,
      });
      expect(count).to.be(0);
    });

    it('removes the transform when the uploaded package is uninstalled', async () => {
      const buf = await buildPackageZip({ sourceIndex: 'logs-transform_identity_test-*' });
      await uploadPackage(buf).expect(200);

      await supertest
        .delete(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      // delete_dest_index is authorized against the uploader's key, which cannot delete indices.
      // Requesting it would strand the transform, so uninstall must drop the transform alone.
      const { count } = await esClient.transform.getTransform({
        transform_id: `logs-${pkgName}.*`,
        allow_no_match: true,
      });
      expect(count).to.be(0);
    });

    it('replaces the transform when a newer fleet_transform_version is uploaded', async () => {
      await uploadPackage(
        await buildPackageZip({ sourceIndex: 'logs-transform_identity_test-*' })
      ).expect(200);

      await waitForUploadSlot();

      await uploadPackage(
        await buildPackageZip({
          sourceIndex: 'logs-transform_identity_test-*',
          version: upgradeVersion,
        })
      ).expect(200);

      const { transforms } = await esClient.transform.getTransform({
        transform_id: `logs-${pkgName}.*`,
        allow_no_match: true,
      });
      expect(transforms.map(({ id }) => id)).to.eql([upgradeTransformId]);

      await supertest
        .delete(`/api/fleet/epm/packages/${pkgName}/${upgradeVersion}`)
        .set('kbn-xsrf', 'xxxx');
    });

    // PUT /custom_integrations/{pkgName} replays the stored archive with force: true, so an
    // uploaded package's real transforms are recreated here. It must not reinstall them under
    // the editing user, or a README edit becomes an alternate reauthorization path around the
    // gate in handleTransformReauthorizeAndStart. It fails closed instead.
    it('refuses to reinstall an uploaded integration whose archive ships transforms', async () => {
      await uploadPackage(
        await buildPackageZip({ sourceIndex: 'logs-transform_identity_test-*' })
      ).expect(200);

      const before = await esClient.transform.getTransform({ transform_id: transformId });
      const keyBefore = (before.transforms[0].authorization as { api_key?: { id: string } })
        ?.api_key?.id;
      expect(keyBefore).to.be.a('string');

      await supertest
        .put(`/api/fleet/epm/custom_integrations/${pkgName}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ readMeData: '# Edited', categories: ['custom'] })
        .expect(403);

      // The transform is untouched and still bound to the uploader, not to the editor.
      const after = await esClient.transform.getTransform({ transform_id: transformId });
      const authorization = after.transforms[0].authorization as
        | { api_key?: { id: string }; roles?: string[] }
        | undefined;
      expect(authorization?.roles).to.be(undefined);
      expect(authorization?.api_key?.id).to.be(keyBefore);
    });

    it('rejects a restricted index in a transform placed outside elasticsearch/', async () => {
      // `isTransform` matches on the third path segment alone, so the installer treats this as a
      // transform. The upload validator must look at exactly the same set of paths.
      const buf = await buildPackageZip({
        sourceIndex: '.fleet-policies',
        transformPath: `${pkgKey}/anything/transform/transform.yml`,
      });
      const res = await uploadPackage(buf).expect(400);

      expect(res.body.message).to.contain('targets the restricted index');
    });
  });
}
