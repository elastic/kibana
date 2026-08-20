/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';

import expect from '@kbn/expect';
import {
  DATASET_CLAIMS_SAVED_OBJECT_TYPE,
  INGEST_SAVED_OBJECT_INDEX,
} from '@kbn/fleet-plugin/common/constants';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const FOREIGN_STREAM = 'logs-foreign.records-teamb';
  const CLAIM = 'logs-foreign.records';
  const PKG = { name: 'dataset_claim_pkg', version: '1.0.0' };
  const TWIN = { name: 'dataset_claim_twin', version: '1.0.0' };

  const zipFixtureFor = ({ name, version }: { name: string; version: string }) =>
    fs.readFileSync(
      path.join(
        path.dirname(__filename),
        '../fixtures/direct_upload_packages',
        `${name}_${version}.zip`
      )
    );

  const createForeignStream = async () => {
    await es.indices.createDataStream({ name: FOREIGN_STREAM });
  };

  const deleteForeignStream = async () => {
    await es.indices.deleteDataStream({ name: FOREIGN_STREAM }, { ignore: [404] });
  };

  const writeIndexPipelineOf = async (dataStream: string): Promise<string | undefined> => {
    const { data_streams: streams } = await es.indices.getDataStream({ name: dataStream });
    const writeIndex = streams[0].indices.at(-1)!.index_name;
    const settings = await es.indices.getSettings({ index: writeIndex });
    return settings[writeIndex]?.settings?.index?.default_pipeline;
  };

  const uploadPackage = async (pkg = PKG, expectedStatus = 200) => {
    // Upload is rate limited to one attempt per 10s; wait like install_by_upload.ts.
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return await supertest
      .post(`/api/fleet/epm/packages`)
      .set('kbn-xsrf', 'xxxx')
      .type('application/zip')
      .send(zipFixtureFor(pkg))
      .expect(expectedStatus);
  };

  const adopt = (packageName: string) =>
    supertest
      .post(`/api/fleet/epm/dataset_claims`)
      .set('kbn-xsrf', 'xxxx')
      .send({ baseName: CLAIM, packageName });

  describe('EPM - dataset ownership', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    beforeEach(createForeignStream);
    afterEach(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/${PKG.name}/${PKG.version}`)
        .set('kbn-xsrf', 'xxxx');
      await supertest
        .delete(`/api/fleet/epm/packages/${TWIN.name}/${TWIN.version}`)
        .set('kbn-xsrf', 'xxxx');
      await es.delete(
        {
          index: INGEST_SAVED_OBJECT_INDEX,
          id: `${DATASET_CLAIMS_SAVED_OBJECT_TYPE}:${CLAIM}`,
          refresh: true,
        },
        { ignore: [404] }
      );
      await deleteForeignStream();
      await es.transport.request(
        { method: 'DELETE', path: `/_index_template/${CLAIM}` },
        { ignore: [404] }
      );
    });

    it('rejects an install that would take over a foreign data stream', async () => {
      const response = await uploadPackage(PKG, 409);

      expect(response.body.message).to.contain(FOREIGN_STREAM);
    });

    it('leaves the existing stream pipeline unchanged after a rejected install', async () => {
      const before = await writeIndexPipelineOf(FOREIGN_STREAM);
      await uploadPackage(PKG, 409);

      expect(await writeIndexPipelineOf(FOREIGN_STREAM)).to.eql(before);
    });

    it('does not change the existing stream after a forced rollover', async () => {
      const before = await writeIndexPipelineOf(FOREIGN_STREAM);
      await uploadPackage(PKG, 409);
      await es.indices.rollover({ alias: FOREIGN_STREAM });

      // The component template carries default_pipeline too, so a rollover is the real proof that
      // the claim was rejected rather than only the in-place mutation being blocked.
      expect(await writeIndexPipelineOf(FOREIGN_STREAM)).to.eql(before);
    });

    it('leaves no residue after a rejected install', async () => {
      await uploadPackage(PKG, 409);

      const templateRes = await es.transport.request(
        { method: 'GET', path: `/_index_template/${CLAIM}` },
        { ignore: [404], meta: true }
      );
      expect(templateRes.statusCode).to.eql(404);
      await supertest.get(`/api/fleet/epm/packages/${PKG.name}/${PKG.version}`).expect(404);
    });

    it('allows the install after the dataset is adopted', async () => {
      await adopt(PKG.name).expect(200);

      await uploadPackage();
    });

    it('restores the original pipeline when the adopting package is uninstalled', async () => {
      const before = await writeIndexPipelineOf(FOREIGN_STREAM);
      await adopt(PKG.name).expect(200);
      await uploadPackage();
      expect(await writeIndexPipelineOf(FOREIGN_STREAM)).to.not.eql(before);

      await supertest
        .delete(`/api/fleet/epm/packages/${PKG.name}/${PKG.version}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(await writeIndexPipelineOf(FOREIGN_STREAM)).to.eql(before);
    });

    it('refuses to adopt a dataset another package already claims', async () => {
      await adopt(PKG.name).expect(200);

      await adopt('someone_else').expect(409);
    });

    it('rejects a second package claiming the same dataset', async () => {
      await deleteForeignStream();
      await adopt(PKG.name).expect(200);
      await uploadPackage();

      await uploadPackage(TWIN, 409);
    });

    it('re-resolves ownership on a resumed install', async () => {
      // The first attempt fails on the ownership conflict, so retryFromLastState has nothing to
      // resume past. The retry must be rejected for the same reason rather than proceeding.
      await uploadPackage(PKG, 409);

      await uploadPackage(PKG, 409);
    });

    it('does not let a non-superuser adopt a dataset', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/epm/dataset_claims`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .send({ baseName: CLAIM, packageName: PKG.name })
        .expect(403);
    });

    it('does not let a non-superuser upload a package', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(zipFixtureFor(PKG))
        .expect(403);
    });

    it('lets a superuser release an abandoned adoption claim', async () => {
      await adopt(PKG.name).expect(200);

      await supertest
        .delete(`/api/fleet/epm/dataset_claims/${CLAIM}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      await adopt('someone_else').expect(200);

      await supertest
        .delete(`/api/fleet/epm/dataset_claims/${CLAIM}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('does not let a non-superuser release a claim', async () => {
      await adopt(PKG.name).expect(200);

      await supertestWithoutAuth
        .delete(`/api/fleet/epm/dataset_claims/${CLAIM}`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .expect(403);

      await supertest
        .delete(`/api/fleet/epm/dataset_claims/${CLAIM}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('refuses to release a claim after the adopting package is installed', async () => {
      const before = await writeIndexPipelineOf(FOREIGN_STREAM);
      await adopt(PKG.name).expect(200);
      await uploadPackage();
      expect(await writeIndexPipelineOf(FOREIGN_STREAM)).to.not.eql(before);

      await supertest
        .delete(`/api/fleet/epm/dataset_claims/${CLAIM}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(409);

      await supertest
        .delete(`/api/fleet/epm/packages/${PKG.name}/${PKG.version}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(await writeIndexPipelineOf(FOREIGN_STREAM)).to.eql(before);
    });
  });
}
