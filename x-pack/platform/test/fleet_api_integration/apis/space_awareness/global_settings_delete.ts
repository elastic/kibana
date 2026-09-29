/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

    // A user with Fleet + Integrations "all" only in the default space
    let defaultSpaceOnlyApiClient: SpaceTestApiClient;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({ space: TEST_SPACE_1 });
      await cleanFleetIndices(esClient);
      await apiClient.postEnableSpaceAwareness();
      await apiClient.setup();
      await createTestSpace(providerContext, TEST_SPACE_1);
      await setupTestUsers({ getService });

      defaultSpaceOnlyApiClient = new SpaceTestApiClient(supertestWithoutAuth, {
        username: testUsers.fleet_all_int_all_default_space_only.username,
        password: testUsers.fleet_all_int_all_default_space_only.password,
      });
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
            .delete(`/s/${TEST_SPACE_1}/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('returns 403 when user lacks privileges in a space that references the output', async () => {
        let err: Error | undefined;
        try {
          await defaultSpaceOnlyApiClient.deleteOutput(outputId);
        } catch (_err) {
          err = _err;
        }
        expect(err).toBeDefined();
        expect(err?.message).toMatch(/403 "Forbidden"/);

        // Verify the output still exists (superuser can still get it)
        const res = await supertest.get(`/api/fleet/outputs/${outputId}`);
        expect(res.status).toBe(200);

        // Verify the agent policy in TEST_SPACE_1 still has the output reference
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.data_output_id).toBe(outputId);
      });

      it('allows delete when user has privileges in all affected spaces', async () => {
        // All-spaces superuser client — can delete
        let err: Error | undefined;
        try {
          await apiClient.deleteOutput(outputId);
        } catch (_err) {
          err = _err;
        }
        expect(err).toBeUndefined();

        // Output is gone
        const res = await supertest.get(`/api/fleet/outputs/${outputId}`);
        expect(res.status).toBe(404);

        // The reference in the agent policy in TEST_SPACE_1 has been cleared
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.data_output_id).toBeNull();

        // Prevent afterEach from trying to delete again
        outputId = '';
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
        expect(dsRes.status).toBe(200);
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
            .delete(`/s/${TEST_SPACE_1}/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('returns 403 when user lacks privileges in a space that references the download source', async () => {
        let err: Error | undefined;
        try {
          await defaultSpaceOnlyApiClient.deleteDownloadSource(downloadSourceId);
        } catch (_err) {
          err = _err;
        }
        expect(err).toBeDefined();
        expect(err?.message).toMatch(/403 "Forbidden"/);

        // Download source still exists
        const res = await supertest.get(`/api/fleet/agent_download_sources/${downloadSourceId}`);
        expect(res.status).toBe(200);

        // Agent policy in TEST_SPACE_1 still has the download_source_id
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.download_source_id).toBe(downloadSourceId);
      });

      it('allows delete when user has privileges in all affected spaces', async () => {
        let err: Error | undefined;
        try {
          await apiClient.deleteDownloadSource(downloadSourceId);
        } catch (_err) {
          err = _err;
        }
        expect(err).toBeUndefined();

        // Download source is gone
        const res = await supertest.get(`/api/fleet/agent_download_sources/${downloadSourceId}`);
        expect(res.status).toBe(404);

        // Reference in TEST_SPACE_1 policy cleared
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.download_source_id).toBeNull();

        downloadSourceId = '';
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
        expect(hostRes.status).toBe(200);
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
            .delete(`/s/${TEST_SPACE_1}/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('returns 403 when user lacks privileges in a space that references the Fleet Server host', async () => {
        let err: Error | undefined;
        try {
          await defaultSpaceOnlyApiClient.deleteFleetServerHosts(fleetServerHostId);
        } catch (_err) {
          err = _err;
        }
        expect(err).toBeDefined();
        expect(err?.message).toMatch(/403 "Forbidden"/);

        // Fleet Server host still exists
        const res = await supertest.get(`/api/fleet/fleet_server_hosts/${fleetServerHostId}`);
        expect(res.status).toBe(200);

        // Agent policy in TEST_SPACE_1 still has the fleet_server_host_id
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.fleet_server_host_id).toBe(fleetServerHostId);
      });

      it('allows delete when user has privileges in all affected spaces', async () => {
        let err: Error | undefined;
        try {
          await apiClient.deleteFleetServerHosts(fleetServerHostId);
        } catch (_err) {
          err = _err;
        }
        expect(err).toBeUndefined();

        // Fleet Server host is gone
        const res = await supertest.get(`/api/fleet/fleet_server_hosts/${fleetServerHostId}`);
        expect(res.status).toBe(404);

        // Reference in TEST_SPACE_1 policy cleared
        const policyRes = await supertest.get(
          `/s/${TEST_SPACE_1}/api/fleet/agent_policies/${agentPolicyId}`
        );
        expect(policyRes.body.item.fleet_server_host_id).toBeNull();

        fleetServerHostId = '';
      });
    });
  });
}
