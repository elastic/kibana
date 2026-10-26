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

  describe('Status', () => {
    let agentPolicyId: string;
    let packagePolicyId: string | undefined;
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

      const { body: agentPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .send({
          name: `Osquery status test policy ${Date.now()}`,
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;

      const { body: packagePolicyResponse } = await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .send({
          policy_id: agentPolicyId,
          package: {
            name: 'osquery_manager',
            version: osqueryPackageVersion,
          },
          name: `Osquery status test ${Date.now()}`,
          namespace: 'default',
          inputs: {
            'osquery_manager-osquery': {
              enabled: true,
              streams: {},
            },
          },
        });

      packagePolicyId = packagePolicyResponse.item?.id;
    });

    after(async () => {
      if (packagePolicyId) {
        await supertest
          .post('/api/fleet/package_policies/delete')
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
          .send({ packagePolicyIds: [packagePolicyId] });
      }

      if (agentPolicyId) {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
          .send({ agentPolicyId });
      }

      if (osqueryPackageVersion) {
        await supertest
          .delete(`/api/fleet/epm/packages/osquery_manager/${osqueryPackageVersion}`)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion);
      }

      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('returns osquery installation status with package info', async () => {
      const response = await supertest
        .get('/internal/osquery/status')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', osqueryInternalApiVersion);

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('name', 'osquery_manager');
      expect(response.body).to.have.property('version');
      expect(response.body).to.have.property('install_status');
    });
  });
}
