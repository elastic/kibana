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

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');
  const retry = getService('retry');

  const pkgName = 'transform_identity_test';
  const pkgVersion = '1.0.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const transformModuleId = 'probe';
  const transformVersion = '1.0.0';
  const transformId = `logs-${pkgName}.${transformModuleId}-default-${transformVersion}`;

  // `start: false` keeps the assertions on the created transform rather than on whether
  // Elasticsearch could start it against a source index this test never creates.
  const buildPackageZip = async ({
    sourceIndex,
    transformPath = `${pkgKey}/elasticsearch/transform/${transformModuleId}/transform.yml`,
  }: {
    sourceIndex: string;
    transformPath?: string;
  }): Promise<Buffer> => {
    const zip = new JSZip();
    zip.file(
      `${pkgKey}/manifest.yml`,
      [
        `name: ${pkgName}`,
        `title: Transform Install Identity Test`,
        `version: ${pkgVersion}`,
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
    zip.file(
      `${pkgKey}/elasticsearch/transform/${transformModuleId}/manifest.yml`,
      ['start: false'].join('\n')
    );
    zip.file(
      transformPath,
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
        `  fleet_transform_version: ${transformVersion}`,
      ].join('\n')
    );
    return await zip.generateAsync({ type: 'nodebuffer' });
  };

  const uploadPackage = (buf: Buffer) =>
    supertest
      .post(`/api/fleet/epm/packages`)
      .set('kbn-xsrf', 'xxxx')
      .type('application/zip')
      .send(buf);

  describe('Transform identity for uploaded packages', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    beforeEach(async () => {
      // Wait until the process-wide upload rate-limit (10 s) has expired before each test.
      // The probe uses a deliberately invalid zip so it always fails before
      // setLastUploadInstallCache() is reached — each probe leaves the slot unchanged.
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
    });

    afterEach(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx');
      await esClient.transform.deleteTransform(
        { transform_id: transformId, force: true },
        { ignore: [404] }
      );
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

      // Persisted so the reauthorize flow stays caller-bound too.
      expect(
        (transforms[0]._meta as { run_as_kibana_system?: boolean })?.run_as_kibana_system
      ).to.be(false);
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
