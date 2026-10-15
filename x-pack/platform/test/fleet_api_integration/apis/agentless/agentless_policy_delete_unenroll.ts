/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as http from 'http';
import { v4 as uuidv4 } from 'uuid';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupMockServer } from '../agents/helpers/mock_agentless_api';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { cleanFleetIndices } from '../space_awareness/helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('fleet_agentless_policy_delete_unenroll', () => {
    skipIfNoDockerRegistry(providerContext);

    const apiClient = new SpaceTestApiClient(supertest);

    let mockApiServer: http.Server;
    let policyId: string;
    let agentId: string;

    before(async () => {
      const mockAgentlessApiService = setupMockServer();
      // Start the mock agentless API server so that deleteAgentlessAgent HTTP calls succeed
      // and do not cause the service to throw before we can check the agent document state.
      mockApiServer = await mockAgentlessApiService.listen(8089);
    });

    after(async () => {
      if (!mockApiServer) return;
      await new Promise<void>((resolve, reject) => {
        mockApiServer.close((err?: Error) => (err ? reject(err) : resolve()));
      });
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await apiClient.setup();

      policyId = uuidv4();
      agentId = `agent-agentless-${policyId}`;

      // Create the agentless policy (also creates the corresponding agent policy SO
      // with supports_agentless: true).
      await apiClient.createAgentlessPolicy({
        id: policyId,
        package: {
          name: 'test_agentless',
          version: '1.0.0',
        },
        name: `test_agentless_delete_unenroll-${Date.now()}`,
        description: 'test agentless unenroll on delete',
        namespace: 'default',
        inputs: {
          'sample-httpjson': {
            enabled: true,
            vars: {
              api_key: 'TEST_VALUE_API_KEY',
            },
            streams: {},
          },
        },
      });

      // Manually insert a fake agent document into .fleet-agents tied to the agentless
      // policy. We set active: true to simulate the orphaned-agent scenario — the agent
      // has enrolled but the agentless deployment will be torn down immediately on delete.
      await es.index({
        index: '.fleet-agents',
        id: agentId,
        refresh: 'wait_for',
        document: {
          id: agentId,
          type: 'PERMANENT',
          active: true,
          enrolled_at: new Date().toISOString(),
          last_checkin: new Date().toISOString(),
          policy_id: policyId,
          policy_revision_idx: 1,
          policy_revision: 1,
          agent: { id: agentId, version: '8.16.0' },
          local_metadata: {
            elastic: { agent: { version: '8.16.0', upgradeable: false } },
            host: { hostname: 'agentless-host' },
            os: { platform: 'linux' },
          },
        },
      });
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
    });

    it('should force-unenroll the agent document (active: false, unenrolled_at set) when deleting an agentless policy', async () => {
      // Delete the agentless policy via the managed integrations endpoint. This triggers
      // agentPolicyService.delete() → unenrollForAgentPolicyId(…, { revoke: true })
      // BEFORE deleteAgentlessAgent() is called.
      await apiClient.deleteAgentlessPolicy(policyId);

      // Fetch the agent document directly from the index to check its final state.
      const agentDoc = await es.get({
        index: '.fleet-agents',
        id: agentId,
      });

      const source = agentDoc._source as Record<string, unknown>;

      // The fix: force-revoke must have set active: false and unenrolled_at synchronously
      // before the agentless deployment was destroyed.
      expect(source.active).to.be(false);
      expect(source.unenrolled_at).to.be.a('string');
      // unenrolled_at must be a non-empty ISO timestamp
      expect((source.unenrolled_at as string).length).to.be.greaterThan(0);
    });
  });
}
