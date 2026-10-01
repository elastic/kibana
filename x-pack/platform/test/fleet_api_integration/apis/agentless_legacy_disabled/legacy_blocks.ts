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

interface LegacyBlockResponse {
  status: number;
  body: {
    message: string;
  };
}

export default function (providerContext: FtrProviderContext) {
  describe('Legacy policy API blocks for agentless', () => {
    const { getService } = providerContext;
    const es = getService('es');
    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    skipIfNoDockerRegistry(providerContext);

    const apiClient = new SpaceTestApiClient(supertest);

    const expectLegacyBlock = (res: LegacyBlockResponse, messagePattern: RegExp) => {
      expect(res.status).to.be(400);
      expect(res.body.message).to.match(messagePattern);
    };

    let mockApiServer: http.Server;
    // For agentless policies the package policy, the paired agent policy, and the
    // agentless policy all share the same id.
    let agentlessId: string;
    let regularAgentPolicyId: string;
    let regularPackagePolicyId: string;

    before(async () => {
      mockApiServer = await setupMockServer().listen(8089);
    });

    // Lazy one-time setup in a beforeEach: `skipIfNoDockerRegistry` guards with a
    // beforeEach, and before-all hooks would run ahead of it and fail instead of
    // skipping when the package registry is not running.
    let initialized = false;
    beforeEach(async () => {
      if (initialized) {
        return;
      }
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await apiClient.setup();

      const agentlessPolicy = await apiClient.createAgentlessPolicy({
        id: uuidv4(),
        package: {
          name: 'test_agentless',
          version: '1.0.0',
        },
        name: `test_agentless-${Date.now()}`,
        description: 'test agentless policy',
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
      agentlessId = agentlessPolicy.item.id;

      const regularAgentPolicy = await apiClient.createAgentPolicy();
      regularAgentPolicyId = regularAgentPolicy.item.id;

      const regularPackagePolicy = await apiClient.createPackagePolicy(undefined, {
        id: uuidv4(),
        policy_ids: [regularAgentPolicyId],
        name: `test_agentless-regular-${Date.now()}`,
        description: 'regular package policy on the mixed-deployment test package',
        namespace: 'default',
        package: {
          name: 'test_agentless',
          version: '1.0.0',
        },
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
      regularPackagePolicyId = regularPackagePolicy.item.id;

      // Only mark done after setup succeeds; otherwise a transient failure would
      // permanently skip setup and fail every later test on undefined ids.
      initialized = true;
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await mockApiServer.close();
    });

    describe('POST /api/fleet/package_policies', () => {
      it('should reject requests with supports_agentless', async () => {
        const res = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `agentless-${uuidv4()}`,
            description: '',
            namespace: 'default',
            policy_ids: [],
            supports_agentless: true,
            inputs: [],
            package: {
              name: 'test_agentless',
              version: '1.0.0',
            },
          });

        expectLegacyBlock(res, /To create managed integrations, use the managed integrations API/);
      });

      it('should reject packages that only support agentless deployment', async () => {
        const res = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `agentless-only-${uuidv4()}`,
            description: '',
            namespace: 'default',
            policy_ids: [],
            inputs: [],
            package: {
              name: 'test_agentless_only',
              version: '1.0.0',
            },
          });

        expectLegacyBlock(res, /can only be used as a managed integration/);
      });

      it('should reject requests targeting an agentless agent policy', async () => {
        const res = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `on-agentless-parent-${uuidv4()}`,
            description: '',
            namespace: 'default',
            policy_ids: [agentlessId],
            inputs: [],
            package: {
              name: 'test_agentless',
              version: '1.0.0',
            },
          });

        expectLegacyBlock(res, /To add integrations to a managed integration/);
      });
    });

    describe('PUT /api/fleet/package_policies/{id}', () => {
      it('should reject updates to agentless package policies', async () => {
        const res = await supertest
          .put(`/api/fleet/package_policies/${agentlessId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `renamed-${Date.now()}`,
          });

        expectLegacyBlock(res, /To update managed integrations, use the managed integrations API/);
      });

      it('should reject re-parenting regular package policies to an agentless agent policy', async () => {
        const res = await supertest
          .put(`/api/fleet/package_policies/${regularPackagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            policy_ids: [agentlessId],
          });

        expectLegacyBlock(res, /To add integrations to a managed integration/);
      });
    });

    describe('POST /api/fleet/package_policies/upgrade', () => {
      it('should reject upgrades targeting agentless package policies', async () => {
        const res = await supertest
          .post('/api/fleet/package_policies/upgrade')
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [agentlessId] });

        expectLegacyBlock(res, /To upgrade managed integrations, use the managed integrations API/);
      });

      it('should reject the whole request when the batch mixes agentless and regular policies', async () => {
        const res = await supertest
          .post('/api/fleet/package_policies/upgrade')
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [regularPackagePolicyId, agentlessId] });

        expectLegacyBlock(res, /To upgrade managed integrations, use the managed integrations API/);
      });

      it('should reject dry runs targeting agentless package policies', async () => {
        const res = await supertest
          .post('/api/fleet/package_policies/upgrade/dryrun')
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [agentlessId] });

        expectLegacyBlock(res, /To upgrade managed integrations, use the managed integrations API/);
      });
    });

    describe('agent policy endpoints', () => {
      it('should reject creating agent policies with supports_agentless', async () => {
        const res = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `agentless-agent-policy-${uuidv4()}`,
            namespace: 'default',
            supports_agentless: true,
          });

        expectLegacyBlock(res, /To create managed integrations, use the managed integrations API/);
      });

      it('should reject updating agentless agent policies', async () => {
        const res = await supertest
          .put(`/api/fleet/agent_policies/${agentlessId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `renamed-${Date.now()}`,
            namespace: 'default',
            description: '',
          });

        expectLegacyBlock(res, /To update managed integrations, use the managed integrations API/);
      });

      it('should reject copying agentless agent policies', async () => {
        const res = await supertest
          .post(`/api/fleet/agent_policies/${agentlessId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `copied-agentless-${uuidv4()}`,
            description: '',
          });

        expectLegacyBlock(res, /Managed integrations cannot be copied/);
      });
    });

    describe('unaffected flows', () => {
      it('should still allow managing agentless policies through the managed integrations API', async () => {
        const updatedName = `test_agentless-updated-${Date.now()}`;
        const { item } = await apiClient.updateAgentlessPolicy(agentlessId, {
          package: { name: 'test_agentless', version: '1.0.0' },
          name: updatedName,
          description: 'updated through the managed integrations API',
          namespace: 'default',
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'UPDATED_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

        expect(item.id).to.be(agentlessId);
        expect(item.name).to.be(updatedName);
      });

      it('should still allow legacy updates of regular package policies', async () => {
        const updatedName = `test_agentless-regular-updated-${Date.now()}`;
        const { item } = await apiClient.updatePackagePolicy(regularPackagePolicyId, {
          policy_ids: [regularAgentPolicyId],
          name: updatedName,
          description: '',
          namespace: 'default',
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'TEST_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

        expect(item.name).to.be(updatedName);
      });

      it('should still allow copying regular agent policies', async () => {
        const res = await supertest
          .post(`/api/fleet/agent_policies/${regularAgentPolicyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `copied-regular-${uuidv4()}`,
            description: '',
          })
          .expect(200);

        expect(res.body.item.id).not.to.be(regularAgentPolicyId);
      });
    });
  });
}
