/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');
  const fleetApiVersion = '2023-10-31';
  const osqueryInternalApiVersion = '1';

  const getAssetsStatus = () =>
    supertest
      .get('/internal/osquery/assets')
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryInternalApiVersion);

  const updateAssetsStatus = () =>
    supertest
      .post('/internal/osquery/assets/update')
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryInternalApiVersion);

  describe('Assets', () => {
    let osqueryPackageVersion: string | undefined;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      const { body: osqueryPackageResponse } = await supertest
        .get('/api/fleet/epm/packages/osquery_manager')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .set('x-elastic-internal-product', 'security-solution');

      osqueryPackageVersion = osqueryPackageResponse.item?.version;

      if (osqueryPackageVersion) {
        await supertest
          .post(`/api/fleet/epm/packages/osquery_manager/${osqueryPackageVersion}`)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
          .send({ force: true })
          .expect(200);
      }
    });

    after(async () => {
      if (osqueryPackageVersion) {
        await supertest
          .delete(`/api/fleet/epm/packages/osquery_manager/${osqueryPackageVersion}`)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion);
      }

      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('returns prebuilt pack assets status with install, update, and upToDate arrays', async () => {
      const response = await getAssetsStatus();

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('install');
      expect(response.body).to.have.property('update');
      expect(response.body).to.have.property('upToDate');
      expect(response.body.install).to.be.an('array');
      expect(response.body.update).to.be.an('array');
      expect(response.body.upToDate).to.be.an('array');
    });

    it('installs prebuilt pack assets and returns updated status', async () => {
      const updateResponse = await updateAssetsStatus();

      expect(updateResponse.status).to.be(200);
      expect(updateResponse.body).to.have.property('install');
      expect(updateResponse.body).to.have.property('update');
      expect(updateResponse.body).to.have.property('upToDate');

      const statusAfterUpdate = await getAssetsStatus();
      expect(statusAfterUpdate.status).to.be(200);

      const totalAssets =
        statusAfterUpdate.body.install.length +
        statusAfterUpdate.body.update.length +
        statusAfterUpdate.body.upToDate.length;
      expect(totalAssets).to.be.greaterThan(0);
    });
  });
}
