/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, createTestSpace } from './helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const TEST_SPACE_1 = 'test1';

  describe('Global settings delete cross-space authorization', function () {
    skipIfNoDockerRegistry(providerContext);

    // The superuser API client (uses default fleet_all_int_all user)
    const apiClient = new SpaceTestApiClient(supertest);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({ space: TEST_SPACE_1 });
      await cleanFleetIndices(esClient);
      await setupTestUsers(getService('security'), true);
      await apiClient.postEnableSpaceAwareness();
      await apiClient.setup();
      await createTestSpace(providerContext, TEST_SPACE_1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({ space: TEST_SPACE_1 });
      await cleanFleetIndices(esClient);
    });

    // ---------------------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------------------
    describe('output delete', () => {
      let outputId: string;
      let agentPolicyId: string;

      beforeEach(async () => {
        // Create a non-default, non-preconfigured output as superuser
        const outputRes = await apiClient.postOutput({
          name: `test-output-${Date.now()}`,
          type: 'elasticsearch',
          hosts: ['https://example.test:9200'],
          is_default: false,
          is_default_monitoring: false,
        });
        outputId = outputRes.item.id;

        // Create an agent policy in TEST_SPACE_1 and assign the output to it
        const policyRes = await apiClient.createAgentPolicy(TEST_SPACE_1);
        agentPolicyId = policyRes.item.id;
        await apiClient.putAgentPolicy(
          agentPolicyId,
          {
            name: policyRes.item.name,
            namespace: 'default',
            data_output_id: outputId,
            monitoring_output_id: outputId,
          },
          TEST_SPACE_1
        );
      });

      afterEach(async () => {
        // Best-effort cleanup
        try {
          await apiClient.deleteOutput(outputId);
        } catch (_) {
          // Ignore if already deleted
        }
        try {
          await supertest
            .post(`/s/${TEST_SPACE_1}/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('returns 403 when user lacks privileges in a space that references the output', async () => {
        const res = await supertestWithoutAuth
          .delete(`/api/fleet/outputs/${outputId}`)
          .auth(
            testUsers.fleet_all_int_all_default_space_only.username,
            testUsers.fleet_all_int_all_default_space_only.password
          )
          .set('kbn-xsrf', 'xxxx');
        expect(res.status).to.eql(403);

        // Verify the output still exists (superuser can still get it)
        const outputRes = await supertest.get(`/api/fleet/outputs/${outputId}`);
        expect(outputRes.status).to.eql(200);

        // Verify the agent policy in TEST_SPACE_1 still has the output reference
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.data_output_id).to.eql(outputId);
      });

      it('allows delete when user has privileges in all affected spaces', async () => {
        await apiClient.deleteOutput(outputId);

        // Output is gone
        const outputRes = await supertest.get(`/api/fleet/outputs/${outputId}`);
        expect(outputRes.status).to.eql(404);

        // The reference in the agent policy in TEST_SPACE_1 has been cleared
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.data_output_id).to.eql(null);

        // Prevent afterEach from trying to delete again
        outputId = '';
      });

      it('returns 403 when output is referenced by a policy shared across multiple spaces', async () => {
        // Share the policy created in beforeEach into default as well
        await apiClient.putAgentPolicy(
          agentPolicyId,
          {
            name: 'shared-policy',
            namespace: 'default',
            data_output_id: outputId,
            monitoring_output_id: outputId,
            space_ids: ['default', TEST_SPACE_1],
          },
          TEST_SPACE_1
        );

        const res = await supertestWithoutAuth
          .delete(`/api/fleet/outputs/${outputId}`)
          .auth(
            testUsers.fleet_all_int_all_default_space_only.username,
            testUsers.fleet_all_int_all_default_space_only.password
          )
          .set('kbn-xsrf', 'xxxx');
        // Even though the policy is also in default, TEST_SPACE_1 membership
        // means the restricted user must not be allowed to delete.
        expect(res.status).to.eql(403);
      });
    });

    // ---------------------------------------------------------------------------
    // Download sources
    // ---------------------------------------------------------------------------
    describe('download source delete', () => {
      let downloadSourceId: string;
      let agentPolicyId: string;

      beforeEach(async () => {
        // Create a non-default download source as superuser
        const dsRes = await supertest
          .post('/api/fleet/agent_download_sources')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `test-ds-${Date.now()}`,
            host: 'https://artifacts.test.example',
            is_default: false,
          });
        expect(dsRes.status).to.eql(200);
        downloadSourceId = dsRes.body.item.id;

        // Create an agent policy in TEST_SPACE_1 and assign the download source
        const policyRes = await apiClient.createAgentPolicy(TEST_SPACE_1);
        agentPolicyId = policyRes.item.id;
        await apiClient.putAgentPolicy(
          agentPolicyId,
          {
            name: policyRes.item.name,
            namespace: 'default',
            download_source_id: downloadSourceId,
          },
          TEST_SPACE_1
        );
      });

      afterEach(async () => {
        try {
          if (downloadSourceId) {
            await apiClient.deleteDownloadSource(downloadSourceId);
          }
        } catch (_) {
          // ignore
        }
        try {
          await supertest
            .post(`/s/${TEST_SPACE_1}/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('returns 403 when user lacks privileges in a space that references the download source', async () => {
        const res = await supertestWithoutAuth
          .delete(`/api/fleet/agent_download_sources/${downloadSourceId}`)
          .auth(
            testUsers.fleet_all_int_all_default_space_only.username,
            testUsers.fleet_all_int_all_default_space_only.password
          )
          .set('kbn-xsrf', 'xxxx');
        expect(res.status).to.eql(403);

        // Download source still exists
        const dsRes = await supertest.get(`/api/fleet/agent_download_sources/${downloadSourceId}`);
        expect(dsRes.status).to.eql(200);

        // Agent policy in TEST_SPACE_1 still has the download_source_id
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.download_source_id).to.eql(downloadSourceId);
      });

      it('allows delete when user has privileges in all affected spaces', async () => {
        await apiClient.deleteDownloadSource(downloadSourceId);

        // Download source is gone
        const dsRes = await supertest.get(`/api/fleet/agent_download_sources/${downloadSourceId}`);
        expect(dsRes.status).to.eql(404);

        // Reference in TEST_SPACE_1 policy cleared
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.download_source_id).to.eql(null);

        downloadSourceId = '';
      });

      it('returns 403 when download source is referenced by a policy shared across multiple spaces', async () => {
        await apiClient.putAgentPolicy(
          agentPolicyId,
          {
            name: 'shared-policy',
            namespace: 'default',
            download_source_id: downloadSourceId,
            space_ids: ['default', TEST_SPACE_1],
          },
          TEST_SPACE_1
        );

        const res = await supertestWithoutAuth
          .delete(`/api/fleet/agent_download_sources/${downloadSourceId}`)
          .auth(
            testUsers.fleet_all_int_all_default_space_only.username,
            testUsers.fleet_all_int_all_default_space_only.password
          )
          .set('kbn-xsrf', 'xxxx');
        expect(res.status).to.eql(403);
      });
    });

    // ---------------------------------------------------------------------------
    // Fleet Server hosts
    // ---------------------------------------------------------------------------
    describe('Fleet Server host delete', () => {
      let fleetServerHostId: string;
      let agentPolicyId: string;

      beforeEach(async () => {
        // Create a non-default Fleet Server host as superuser
        const hostRes = await supertest
          .post('/api/fleet/fleet_server_hosts')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `test-fsh-${Date.now()}`,
            host_urls: ['https://fleet-server.test:8220'],
            is_default: false,
          });
        expect(hostRes.status).to.eql(200);
        fleetServerHostId = hostRes.body.item.id;

        // Create an agent policy in TEST_SPACE_1 and assign the Fleet Server host
        const policyRes = await apiClient.createAgentPolicy(TEST_SPACE_1);
        agentPolicyId = policyRes.item.id;
        await apiClient.putAgentPolicy(
          agentPolicyId,
          {
            name: policyRes.item.name,
            namespace: 'default',
            fleet_server_host_id: fleetServerHostId,
          },
          TEST_SPACE_1
        );
      });

      afterEach(async () => {
        try {
          if (fleetServerHostId) {
            await apiClient.deleteFleetServerHosts(fleetServerHostId);
          }
        } catch (_) {
          // ignore
        }
        try {
          await supertest
            .post(`/s/${TEST_SPACE_1}/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('returns 403 when user lacks privileges in a space that references the Fleet Server host', async () => {
        const res = await supertestWithoutAuth
          .delete(`/api/fleet/fleet_server_hosts/${fleetServerHostId}`)
          .auth(
            testUsers.fleet_all_int_all_default_space_only.username,
            testUsers.fleet_all_int_all_default_space_only.password
          )
          .set('kbn-xsrf', 'xxxx');
        expect(res.status).to.eql(403);

        // Fleet Server host still exists
        const hostRes = await supertest.get(`/api/fleet/fleet_server_hosts/${fleetServerHostId}`);
        expect(hostRes.status).to.eql(200);

        // Agent policy in TEST_SPACE_1 still has the fleet_server_host_id
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.fleet_server_host_id).to.eql(fleetServerHostId);
      });

      it('allows delete when user has privileges in all affected spaces', async () => {
        await apiClient.deleteFleetServerHosts(fleetServerHostId);

        // Fleet Server host is gone
        const hostRes = await supertest.get(`/api/fleet/fleet_server_hosts/${fleetServerHostId}`);
        expect(hostRes.status).to.eql(404);

        // Reference in TEST_SPACE_1 policy cleared
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.fleet_server_host_id).to.eql(null);

        fleetServerHostId = '';
      });

      it('returns 403 when Fleet Server host is referenced by a policy shared across multiple spaces', async () => {
        await apiClient.putAgentPolicy(
          agentPolicyId,
          {
            name: 'shared-policy',
            namespace: 'default',
            fleet_server_host_id: fleetServerHostId,
            space_ids: ['default', TEST_SPACE_1],
          },
          TEST_SPACE_1
        );

        const res = await supertestWithoutAuth
          .delete(`/api/fleet/fleet_server_hosts/${fleetServerHostId}`)
          .auth(
            testUsers.fleet_all_int_all_default_space_only.username,
            testUsers.fleet_all_int_all_default_space_only.password
          )
          .set('kbn-xsrf', 'xxxx');
        expect(res.status).to.eql(403);
      });
    });
  });
}
