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

  const getWithInternalHeaders = (path: string) =>
    supertest
      .get(path)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryInternalApiVersion);

  const postWithInternalHeaders = (path: string) =>
    supertest
      .post(path)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryInternalApiVersion);

  describe('Fleet wrapper', () => {
    let agentPolicyId: string;
    let agentId: string;
    let packagePolicyId: string | undefined;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      const { body: agentPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .send({
          name: `Osquery policy ${Date.now()}`,
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;
      agentId = `osquery-agent-${Date.now()}`;

      const { body: osqueryPackageResponse } = await supertest
        .get('/api/fleet/epm/packages/osquery_manager')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .set('x-elastic-internal-product', 'security-solution');

      const { body: packagePolicyResponse } = await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .send({
          policy_id: agentPolicyId,
          package: {
            name: 'osquery_manager',
            version: osqueryPackageResponse.item?.version,
          },
          name: `Osquery policy ${Date.now()}`,
          description: '',
          namespace: 'default',
          inputs: {
            'osquery_manager-osquery': {
              enabled: true,
              streams: {},
            },
          },
        });

      packagePolicyId = packagePolicyResponse.item?.id;

      await fleetAndAgents.generateAgent('online', agentId, agentPolicyId);
    });

    after(async () => {
      if (agentPolicyId) {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
          .send({ agentPolicyId });
      }

      if (packagePolicyId) {
        await supertest
          .post('/api/fleet/package_policies/delete')
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
          .send({ packagePolicyIds: [packagePolicyId] });
      }

      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('lists agents', async () => {
      const response = await getWithInternalHeaders(
        '/internal/osquery/fleet_wrapper/agents?page=1&perPage=20&showInactive=false&kuery='
      );

      expect(response.status).to.be(200);
      expect(response.body.total).to.be.greaterThan(0);
      expect(response.body).to.have.property('agents');
      expect(response.body).to.have.property('groups');
    });

    it('returns bulk agent details', async () => {
      const response = await postWithInternalHeaders(
        '/internal/osquery/fleet_wrapper/agents/_bulk'
      ).send({
        agentIds: [agentId],
      });

      expect(response.status).to.be(200);
      expect(response.body.agents.some((agent: { id: string }) => agent.id === agentId)).to.be(
        true
      );
    });

    it('lists agent policies', async () => {
      const response = await getWithInternalHeaders(
        '/internal/osquery/fleet_wrapper/agent_policies'
      );

      expect(response.status).to.be(200);
      expect(response.body).to.be.an('array');
    });

    it('reads an agent policy', async () => {
      const response = await getWithInternalHeaders(
        `/internal/osquery/fleet_wrapper/agent_policies/${agentPolicyId}`
      );

      expect(response.status).to.be(200);
      expect(response.body.item.id).to.be(agentPolicyId);
    });

    it('returns agent status for policy', async () => {
      const response = await getWithInternalHeaders(
        `/internal/osquery/fleet_wrapper/agent_status?policyId=${agentPolicyId}`
      );

      expect(response.status).to.be(200);
    });

    it('lists package policies', async () => {
      const response = await getWithInternalHeaders(
        '/internal/osquery/fleet_wrapper/package_policies'
      );

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('items');
    });

    it('returns agent details', async () => {
      const response = await getWithInternalHeaders(
        `/internal/osquery/fleet_wrapper/agents/${agentId}`
      );

      expect(response.status).to.be(200);
      expect(response.body.item.id).to.be(agentId);
    });
  });
}
