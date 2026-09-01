/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { ECH_AGENTLESS_OUTPUT_ID } from '@kbn/fleet-plugin/common/constants';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupMockServer } from '../agents/helpers/mock_agentless_api';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import {
  cleanFleetIndices,
  expectToRejectWithError,
  expectToRejectWithNotFound,
} from '../space_awareness/helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  describe('Agentless Policies', () => {
    const { getService } = providerContext;
    const es = getService('es');
    const supertest = getService('supertest');
    // Authz tests must run as a specific test user; the shared `supertest` service is
    // pre-authenticated as the superuser and ignores per-request `.auth()`, so a
    // dedicated `supertestWithoutAuth` agent is required to exercise a non-superuser.
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    const kibanaServer = getService('kibanaServer');

    skipIfNoDockerRegistry(providerContext);

    const apiClient = new SpaceTestApiClient(supertest);

    let mockApiServer: http.Server;
    describe('Managed integrations route path', () => {
      // The deprecated agentless_policies public paths are aliased to the same handlers as
      // managed_integrations, so an empty body fails validation with 400 — proving the path
      // still resolves (a 404 would mean the alias is gone).
      it('still serves the deprecated agentless_policies public path as an alias', async () => {
        await supertest
          .post('/api/fleet/agentless_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({})
          .expect(400);
      });

      it('serves the new managed_integrations public path', async () => {
        await supertest
          .post('/api/fleet/managed_integrations')
          .set('kbn-xsrf', 'xxxx')
          .send({})
          .expect(400);
      });

      it('does not alias the internal sync path under agentless_policies', async () => {
        await supertest
          .post('/internal/fleet/agentless_policies/_sync')
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({})
          .expect(404);
      });
    });

    describe('Create Agentless Policy', () => {
      before(async () => {
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089); // Start the agentless api mock server on port 8089
        mockApiServer.addListener('request', (request) => {
          request.on('data', (data) => {
            apiCalls.push({
              url: request.url || '',
              method: request.method || '',
              data: JSON.parse(data.toString()),
            });
          });
        });
      });

      after(async () => {
        await mockApiServer.close();
      });

      let apiCalls: Array<{
        url: string;
        method: string;
        data: any;
      }> = [];
      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        apiCalls = [];
        await cleanFleetIndices(es);
        await apiClient.setup();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it('should allow to create an agentless policy and create related resources', async () => {
        const id = uuidv4();

        const policy = await apiClient.createAgentlessPolicy({
          id,
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

        const packagePolicy = await apiClient.getPackagePolicy(policy.item.id);
        expect(packagePolicy.item.supports_agentless).to.be(true);

        const agentPolicy = await apiClient.getAgentPolicy(policy.item.id);
        expect(agentPolicy.item.supports_agentless).to.be(true);
        // Managed bulk is disabled in this suite's config (config.agentless.ts): agentless
        // policies must keep using the direct-ES output.
        expect(agentPolicy.item.data_output_id).to.be(ECH_AGENTLESS_OUTPUT_ID);
        expect(agentPolicy.item.monitoring_output_id).to.be(ECH_AGENTLESS_OUTPUT_ID);

        expect(apiCalls.length).to.be(1);
        expect(apiCalls[0].url).to.be('/agentless-api/api/v1/ess/deployments');
        expect(apiCalls[0].method).to.be('POST');
        expect(apiCalls[0].data.policy_id).to.be(agentPolicy.item.id);
        expect(apiCalls[0].data.policy_id).to.be(agentPolicy.item.id);
        expect(apiCalls[0].data.fleet_url).to.be('https://deploymentid.fleet.hello.com:443');
        expect(apiCalls[0].data.fleet_token).not.to.be(undefined);
        expect(apiCalls[0].data.labels).to.eql({
          owner: {
            org: 'security',
            division: 'engineering',
            team: 'security-service-integrations',
          },
        });
      });

      it('should handle id conflict and not delete existing package or agent policy', async () => {
        const id = uuidv4();
        const policy = await apiClient.createAgentlessPolicy({
          id,
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

        await expectToRejectWithError(
          () =>
            apiClient.createAgentlessPolicy({
              id,
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
            }),
          /409 "Conflict"/
        );

        const packagePolicy = await apiClient.getPackagePolicy(policy.item.id);
        expect(packagePolicy.item.supports_agentless).to.be(true);

        const agentPolicy = await apiClient.getAgentPolicy(policy.item.id);
        expect(agentPolicy.item.supports_agentless).to.be(true);
      });

      it('should handle package policy name conflict and not delete existing package policy', async () => {
        const packagePolicyName = `test_agentless-${Date.now()}`;

        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: packagePolicyName,
          description: 'test ',
          namespace: 'default',
          policy_ids: [],
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

        const id = uuidv4();
        await expectToRejectWithError(
          () =>
            apiClient.createAgentlessPolicy({
              id,
              package: {
                name: 'test_agentless',
                version: '1.0.0',
              },
              name: packagePolicyName,
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
            }),
          /409 "Conflict"/
        );

        await apiClient.getPackagePolicy(packagePolicyRes.item.id);

        await expectToRejectWithNotFound(() => apiClient.getAgentPolicy(id));
      });

      it('should handle agent policy name conflict and not delete existing agent policy', async () => {
        const packagePolicyId = uuidv4();
        const packagePolicyName = `test_agentless-${Date.now()}`;
        const agentPolicyName = `Agentless policy for ${packagePolicyName}`;

        const agentPolicyRes = await apiClient.createAgentPolicy(undefined, {
          name: agentPolicyName,
          description: 'test ',
          namespace: 'default',
        });

        await expectToRejectWithError(
          () =>
            apiClient.createAgentlessPolicy({
              id: packagePolicyId,
              package: {
                name: 'test_agentless',
                version: '1.0.0',
              },
              name: packagePolicyName,
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
            }),
          /409 "Conflict"/
        );

        await apiClient.getAgentPolicy(agentPolicyRes.item.id);

        await expectToRejectWithNotFound(() => apiClient.getPackagePolicy(packagePolicyId));
      });
    });

    describe('Delete Agentless Policy', () => {
      before(async () => {
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089); // Start the agentless api mock server on port 8089

        mockApiServer.addListener('request', (request) => {
          apiCalls.push({
            url: request.url || '',
            method: request.method || '',
          });
        });
      });

      after(async () => {
        await mockApiServer.close();
      });

      let apiCalls: Array<{
        url: string;
        method: string;
      }> = [];
      let policyId: string;
      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();

        await cleanFleetIndices(es);
        await apiClient.setup();

        policyId = uuidv4();

        await apiClient.createAgentlessPolicy({
          id: policyId,
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

        apiCalls = [];
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it('should allow to delete an agentless policy and delete related resources', async () => {
        await apiClient.deleteAgentlessPolicy(policyId);

        await expectToRejectWithNotFound(() => apiClient.getPackagePolicy(policyId));

        await expectToRejectWithNotFound(() => apiClient.getAgentPolicy(policyId));

        expect(apiCalls.length).to.be(1);
        expect(apiCalls[0].url).to.be(`/agentless-api/api/v1/ess/deployments/${policyId}`);
        expect(apiCalls[0].method).to.be('DELETE');
      });

      it('should allow to delete an orphaned agentless policy when agent policy is missing', async () => {
        // Orphan the policy by directly deleting the agent policy SO
        await es.delete({
          index: '.kibana_ingest',
          id: `fleet-agent-policies:${policyId}`,
          refresh: 'wait_for',
        });

        // Verify agent policy is gone
        await expectToRejectWithNotFound(() => apiClient.getAgentPolicy(policyId));

        // Delete via agentless API should succeed despite missing agent policy
        await apiClient.deleteAgentlessPolicy(policyId);

        // Verify package policy is cleaned up
        await expectToRejectWithNotFound(() => apiClient.getPackagePolicy(policyId));

        // Verify agentless API DELETE was called to clean up the deployment
        expect(apiCalls.length).to.be(1);
        expect(apiCalls[0].url).to.be(`/agentless-api/api/v1/ess/deployments/${policyId}`);
        expect(apiCalls[0].method).to.be('DELETE');
      });
    });

    describe('Get Agentless Policy', () => {
      before(async () => {
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089);
      });

      after(async () => {
        await mockApiServer.close();
      });

      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
        await apiClient.setup();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it('should return an agentless policy with a clean response shape', async () => {
        const id = uuidv4();
        await apiClient.createAgentlessPolicy({
          id,
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

        const { item } = await apiClient.getAgentlessPolicy(id);

        expect(item.id).to.be(id);
        expect(item.namespace).to.be('default');
        expect(item.package.name).to.be('test_agentless');

        // The agentless contract must not leak underlying Fleet package-policy internals
        expect(item).to.not.have.property('policy_ids');
        expect(item).to.not.have.property('revision');
        expect(item).to.not.have.property('supports_agentless');
        expect(item).to.not.have.property('enabled');
      });

      it('should return 404 for a missing policy id', async () => {
        await expectToRejectWithNotFound(() => apiClient.getAgentlessPolicy(uuidv4()));
      });

      it('should return 404 for an existing non-agentless package policy', async () => {
        const agentPolicyRes = await apiClient.createAgentPolicy(undefined, {
          name: `standard-policy-${Date.now()}`,
          namespace: 'default',
          description: '',
        });

        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: `regular-package-policy-${Date.now()}`,
          namespace: 'default',
          policy_ids: [agentPolicyRes.item.id],
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

        // The regular package policy exists, but must not be reachable via the agentless API
        await apiClient.getPackagePolicy(packagePolicyRes.item.id);
        await expectToRejectWithNotFound(() =>
          apiClient.getAgentlessPolicy(packagePolicyRes.item.id)
        );
      });
    });

    describe('List Agentless Policies', () => {
      before(async () => {
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089);
      });

      after(async () => {
        await mockApiServer.close();
      });

      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
        await apiClient.setup();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      const createAgentlessPolicyWithName = async (name: string) => {
        const id = uuidv4();
        await apiClient.createAgentlessPolicy({
          id,
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name,
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
        return id;
      };

      it('should only return agentless policies (scoped) with a clean response shape', async () => {
        await createAgentlessPolicyWithName(`test_agentless-a-${Date.now()}`);
        await createAgentlessPolicyWithName(`test_agentless-b-${Date.now()}`);

        // A regular (non-agentless) package policy that must be excluded from the list
        const agentPolicyRes = await apiClient.createAgentPolicy(undefined, {
          name: `standard-policy-${Date.now()}`,
          namespace: 'default',
          description: '',
        });
        await apiClient.createPackagePolicy(undefined, {
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: `regular-package-policy-${Date.now()}`,
          namespace: 'default',
          policy_ids: [agentPolicyRes.item.id],
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

        const res = await apiClient.listAgentlessPolicies();

        expect(res.total).to.be(2);
        expect(res.items.length).to.be(2);
        expect(res.page).to.be(1);
        expect(res.perPage).to.be(20);

        for (const item of res.items) {
          expect(item).to.not.have.property('policy_ids');
          expect(item).to.not.have.property('revision');
          expect(item).to.not.have.property('supports_agentless');
        }
      });

      it('should respect paging parameters', async () => {
        await createAgentlessPolicyWithName(`test_agentless-a-${Date.now()}`);
        await createAgentlessPolicyWithName(`test_agentless-b-${Date.now()}`);
        await createAgentlessPolicyWithName(`test_agentless-c-${Date.now()}`);

        const firstPage = await apiClient.listAgentlessPolicies({ page: 1, perPage: 2 });
        expect(firstPage.total).to.be(3);
        expect(firstPage.items.length).to.be(2);

        const secondPage = await apiClient.listAgentlessPolicies({ page: 2, perPage: 2 });
        expect(secondPage.total).to.be(3);
        expect(secondPage.items.length).to.be(1);
      });

      it('should filter results using an allowed kuery field', async () => {
        const uniqueName = `test_agentless-unique-${uuidv4()}`;
        await createAgentlessPolicyWithName(uniqueName);
        await createAgentlessPolicyWithName(`test_agentless-other-${Date.now()}`);

        const res = await apiClient.listAgentlessPolicies({
          kuery: `name:"${uniqueName}"`,
        });

        expect(res.total).to.be(1);
        expect(res.items.length).to.be(1);
        expect(res.items[0].name).to.be(uniqueName);
      });

      it('should reject a kuery filtering on a disallowed field', async () => {
        await expectToRejectWithError(
          () => apiClient.listAgentlessPolicies({ kuery: 'supports_agentless:true' }),
          /400/
        );
      });
    });

    describe('Update Agentless Policy', () => {
      let apiCalls: Array<{
        url: string;
        method: string;
        data?: any;
      }> = [];

      // A user with integrations read (but not write) to assert the route's write authz.
      // Must use `supertestWithoutAuth` so the request runs as this user rather than the superuser.
      const readOnlyApiClient = new SpaceTestApiClient(
        supertestWithoutAuth,
        testUsers.fleet_all_int_read
      );

      const createTestAgentlessPolicy = (id: string, name: string) =>
        apiClient.createAgentlessPolicy({
          id,
          package: { name: 'test_agentless', version: '1.0.0' },
          name,
          description: 'test agentless policy',
          namespace: 'default',
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'TEST_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

      before(async () => {
        await setupTestUsers(getService('security'));
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089);
        mockApiServer.addListener('request', (request) => {
          if (request.method === 'POST') {
            request.on('data', (data) => {
              apiCalls.push({
                url: request.url || '',
                method: request.method || '',
                data: JSON.parse(data.toString()),
              });
            });
          }
        });
      });

      after(async () => {
        await mockApiServer.close();
      });

      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        apiCalls = [];
        await cleanFleetIndices(es);
        await apiClient.setup();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it('should only increment the agent policy revision once when the package policy is renamed', async () => {
        const policyId = uuidv4();
        const originalName = `test_agentless-${Date.now()}`;

        await apiClient.createAgentlessPolicy({
          id: policyId,
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: originalName,
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

        const agentPolicyBeforeUpdate = await apiClient.getAgentPolicy(policyId);
        const revisionBeforeUpdate = agentPolicyBeforeUpdate.item.revision;

        // Reset API call tracker so we only count calls from the update
        apiCalls = [];

        await apiClient.updatePackagePolicy(policyId, {
          name: `test_agentless_renamed-${Date.now()}`,
          policy_ids: [policyId],
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
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

        // The agentless API should be called exactly once, not twice
        expect(apiCalls.length).to.be(1);
        expect(apiCalls[0].url).to.be('/agentless-api/api/v1/ess/deployments');
        expect(apiCalls[0].method).to.be('POST');

        // The agent policy revision should be incremented exactly once
        const agentPolicyAfterUpdate = await apiClient.getAgentPolicy(policyId);
        expect(agentPolicyAfterUpdate.item.revision).to.be(revisionBeforeUpdate + 1);
      });

      it('should full-replace an agentless policy and return a clean response shape', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        apiCalls = [];

        const updatedName = `test_agentless-updated-${Date.now()}`;
        const { item } = await apiClient.updateAgentlessPolicy(policyId, {
          package: { name: 'test_agentless', version: '1.0.0' },
          name: updatedName,
          description: 'updated description',
          namespace: 'default',
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'UPDATED_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

        expect(item.id).to.be(policyId);
        expect(item.name).to.be(updatedName);
        expect(item.description).to.be('updated description');

        // The agentless contract must not leak underlying Fleet package-policy internals
        expect(item).to.not.have.property('policy_ids');
        expect(item).to.not.have.property('revision');
        expect(item).to.not.have.property('supports_agentless');
        expect(item).to.not.have.property('enabled');

        // Both backing saved objects reflect the change (agent policy name stays in sync).
        const packagePolicy = await apiClient.getPackagePolicy(policyId);
        expect(packagePolicy.item.name).to.be(updatedName);
        expect(packagePolicy.item.supports_agentless).to.be(true);

        const agentPolicy = await apiClient.getAgentPolicy(policyId);
        expect(agentPolicy.item.name).to.be(`Agentless policy for ${updatedName}`);

        // The live workload is reconciled with the agentless API.
        expect(
          apiCalls.find(
            (call) => call.method === 'POST' && call.url === '/agentless-api/api/v1/ess/deployments'
          )
        ).not.to.be(undefined);
      });

      it('should reject a change to the package name', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        await expectToRejectWithError(
          () =>
            apiClient.updateAgentlessPolicy(policyId, {
              package: { name: 'a_different_package', version: '1.0.0' },
              name: `test_agentless-${Date.now()}`,
              description: 'test agentless policy',
              namespace: 'default',
              inputs: {
                'sample-httpjson': {
                  enabled: true,
                  vars: { api_key: 'TEST_VALUE_API_KEY' },
                  streams: {},
                },
              },
            }),
          /400 .*Cannot change the integration package/
        );
      });

      it('should return 404 when updating a missing policy', async () => {
        await expectToRejectWithNotFound(() =>
          apiClient.updateAgentlessPolicy(uuidv4(), {
            package: { name: 'test_agentless', version: '1.0.0' },
            name: `test_agentless-${Date.now()}`,
            description: 'test agentless policy',
            namespace: 'default',
            inputs: {
              'sample-httpjson': {
                enabled: true,
                vars: { api_key: 'TEST_VALUE_API_KEY' },
                streams: {},
              },
            },
          })
        );
      });

      it('should return 404 when updating an existing non-agentless package policy', async () => {
        const agentPolicyRes = await apiClient.createAgentPolicy(undefined, {
          name: `standard-policy-${Date.now()}`,
          namespace: 'default',
          description: '',
        });

        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          package: { name: 'test_agentless', version: '1.0.0' },
          name: `regular-package-policy-${Date.now()}`,
          namespace: 'default',
          policy_ids: [agentPolicyRes.item.id],
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'TEST_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

        // The regular package policy exists, but must not be mutable via the agentless API
        await expectToRejectWithNotFound(() =>
          apiClient.updateAgentlessPolicy(packagePolicyRes.item.id, {
            package: { name: 'test_agentless', version: '1.0.0' },
            name: `regular-package-policy-updated-${Date.now()}`,
            description: 'test',
            namespace: 'default',
            inputs: {
              'sample-httpjson': {
                enabled: true,
                vars: { api_key: 'TEST_VALUE_API_KEY' },
                streams: {},
              },
            },
          })
        );
      });

      it('should reject the update for a user without writeIntegrationPolicies', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        await expectToRejectWithError(
          () =>
            readOnlyApiClient.updateAgentlessPolicy(policyId, {
              package: { name: 'test_agentless', version: '1.0.0' },
              name: `test_agentless-${Date.now()}`,
              description: 'test agentless policy',
              namespace: 'default',
              inputs: {
                'sample-httpjson': {
                  enabled: true,
                  vars: { api_key: 'TEST_VALUE_API_KEY' },
                  streams: {},
                },
              },
            }),
          /403/
        );
      });
    });

    describe('Upgrade Agentless Policies', () => {
      let apiCalls: Array<{
        url: string;
        method: string;
        data?: any;
      }> = [];

      // A user with integrations read (but not write) to assert the routes' authz split.
      // Must use `supertestWithoutAuth` so the request runs as this user rather than the
      // superuser (plain `supertest` is pre-authenticated as the superuser and ignores
      // `.auth()`, which would let the write-guarded bulk upgrade return 200 instead of 403).
      const readOnlyApiClient = new SpaceTestApiClient(
        supertestWithoutAuth,
        testUsers.fleet_all_int_read
      );

      const createTestAgentlessPolicy = (id: string, name: string) =>
        apiClient.createAgentlessPolicy({
          id,
          package: { name: 'test_agentless', version: '1.0.0' },
          name,
          description: 'test agentless policy',
          namespace: 'default',
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'TEST_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

      before(async () => {
        await setupTestUsers(getService('security'));
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089);
        mockApiServer.addListener('request', (request) => {
          if (request.method === 'POST') {
            request.on('data', (data) => {
              apiCalls.push({
                url: request.url || '',
                method: request.method || '',
                data: JSON.parse(data.toString()),
              });
            });
          }
        });
      });

      after(async () => {
        await mockApiServer.close();
      });

      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        apiCalls = [];
        await cleanFleetIndices(es);
        await apiClient.setup();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it('should return a per-policy success for each upgraded policy', async () => {
        const policyId1 = uuidv4();
        const policyId2 = uuidv4();
        await createTestAgentlessPolicy(policyId1, `test_agentless-a-${Date.now()}`);
        await createTestAgentlessPolicy(policyId2, `test_agentless-b-${Date.now()}`);

        apiCalls = [];

        const res = await apiClient.bulkUpgradeAgentlessPolicies([policyId1, policyId2]);

        // `success` reflects the saved-object upgrade; the live workload is reconciled
        // asynchronously by a background deploy task (mirrors package-policy bulk
        // upgrade), so the deploy is intentionally not asserted synchronously here.
        expect(res.length).to.be(2);
        for (const item of res) {
          expect(item.success).to.be(true);
        }
        expect(res.map((item) => item.id).sort()).to.eql([policyId1, policyId2].sort());
      });

      it('should be a genuine no-op (idempotent success, no revision bump) when already at the installed version', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        // The policy is created at the installed version (1.0.0), so `_upgrade` has nothing
        // to do. It must stay idempotent-success without re-persisting the saved object.
        const before = await apiClient.getPackagePolicy(policyId);
        const revisionBefore = before.item.revision;

        const res = await apiClient.bulkUpgradeAgentlessPolicies([policyId]);
        expect(res.length).to.be(1);
        expect(res[0].success).to.be(true);

        const after = await apiClient.getPackagePolicy(policyId);
        expect(after.item.revision).to.be(revisionBefore);
      });

      it('should return 200 with per-policy failures for missing/non-agentless ids while upgrading valid ids', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        // A regular (non-agentless) package policy that must not be upgradable here.
        const agentPolicyRes = await apiClient.createAgentPolicy(undefined, {
          name: `standard-policy-${Date.now()}`,
          namespace: 'default',
          description: '',
        });
        const regularPackagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          package: { name: 'test_agentless', version: '1.0.0' },
          name: `regular-package-policy-${Date.now()}`,
          namespace: 'default',
          policy_ids: [agentPolicyRes.item.id],
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'TEST_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

        const missingId = uuidv4();

        // No top-level promotion: the batch returns 200 with a per-policy array, so valid
        // ids upgrade while missing / non-agentless ids surface a per-item 404. Results stay
        // in request order.
        const res = await apiClient.bulkUpgradeAgentlessPolicies([
          policyId,
          regularPackagePolicyRes.item.id,
          missingId,
        ]);

        expect(res.length).to.be(3);
        expect(res.map((item) => item.id)).to.eql([
          policyId,
          regularPackagePolicyRes.item.id,
          missingId,
        ]);

        const [validRes, regularRes, missingRes] = res;
        expect(validRes.success).to.be(true);
        expect(regularRes.success).to.be(false);
        expect(regularRes.statusCode).to.be(404);
        expect(missingRes.success).to.be(false);
        expect(missingRes.statusCode).to.be(404);

        // The non-agentless policy must remain untouched (not upgraded through this API).
        await apiClient.getPackagePolicy(regularPackagePolicyRes.item.id);
      });

      it('should preview the upgrade as a clean, PUT-consumable agentless policy', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        const res = await apiClient.upgradeAgentlessPoliciesDryRun([policyId]);

        expect(res.length).to.be(1);
        const [item] = res;
        expect(item.id).to.be(policyId);
        expect(item.hasErrors).to.be(false);
        expect(item.currentVersion).to.be('1.0.0');
        expect(item.proposedVersion).to.be('1.0.0');
        expect(item.proposedPolicy).not.to.be(undefined);
        expect(item.proposedPolicy?.id).to.be(policyId);
        expect(item.proposedPolicy?.package.name).to.be('test_agentless');

        // The proposed policy must be the clean agentless shape, never Fleet internals.
        expect(item.proposedPolicy).to.not.have.property('policy_ids');
        expect(item.proposedPolicy).to.not.have.property('revision');
        expect(item.proposedPolicy).to.not.have.property('supports_agentless');
      });

      it('should return 200 with a per-policy failure for a missing policy in the dry-run', async () => {
        const missingId = uuidv4();

        // A per-policy guard failure is surfaced as a dry-run item (`hasErrors: true` +
        // per-item 404), not promoted to a top-level HTTP error.
        const res = await apiClient.upgradeAgentlessPoliciesDryRun([missingId]);

        expect(res.length).to.be(1);
        const [item] = res;
        expect(item.id).to.be(missingId);
        expect(item.hasErrors).to.be(true);
        expect(item.statusCode).to.be(404);
      });

      it('should reject the bulk upgrade for a user without writeIntegrationPolicies', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        await expectToRejectWithError(
          () => readOnlyApiClient.bulkUpgradeAgentlessPolicies([policyId]),
          /403/
        );
      });

      it('should allow the dry-run for a user with only readIntegrationPolicies', async () => {
        const policyId = uuidv4();
        await createTestAgentlessPolicy(policyId, `test_agentless-${Date.now()}`);

        const res = await readOnlyApiClient.upgradeAgentlessPoliciesDryRun([policyId]);
        expect(res.length).to.be(1);
        expect(res[0].id).to.be(policyId);
      });
    });

    describe('Sync Agentless Policies', () => {
      let apiCalls: Array<{
        url: string;
        method: string;
        data?: any;
      }> = [];
      before(async () => {
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089); // Start the agentless api mock server on port 8089
        mockApiServer.addListener('request', (request) => {
          if (request.method === 'POST') {
            request.on('data', (data) => {
              apiCalls.push({
                url: request.url || '',
                method: request.method || '',
                data: JSON.parse(data.toString()),
              });
            });
          } else {
            apiCalls.push({
              url: request.url || '',
              method: request.method || '',
            });
          }
        });
      });

      after(async () => {
        await mockApiServer.close();
      });

      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();

        await cleanFleetIndices(es);
        await apiClient.setup();

        await apiClient.createAgentlessPolicy({
          id: 'agentless-deployment-1',
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: 'Test agentless policy ' + Date.now(),
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

        await apiClient.createAgentlessPolicy({
          id: 'agentless-deployment-3',
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: 'Test agentless policy ' + Date.now(),
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
        apiCalls = [];
      });
      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it('should allow to sync agentless policies', async () => {
        // agentless-deployment-1 is already synced
        // agentless-deployment-2 does not exist anymore and should be deleted
        // agentless-deployment-3 needs to be created

        await apiClient.syncAgentlessPolicies();
        expect(apiCalls.length).to.be(3);

        expect(apiCalls.find((call) => call.method === 'GET')).not.to.be(undefined);
        expect(
          apiCalls.find(
            (call) => call.method === 'POST' && call.data?.policy_id === 'agentless-deployment-3'
          )
        ).not.to.be(undefined);
        expect(
          apiCalls.find(
            (call) =>
              call.url === '/agentless-api/api/v1/ess/deployments/agentless-deployment-2' &&
              call.method === 'DELETE'
          )
        ).not.to.be(undefined);
      });

      it('should do nothing in dryrun', async () => {
        // agentless-deployment-1 is already synced
        // agentless-deployment-2 does not exist anymore and should be deleted
        // agentless-deployment-3 needs to be created

        await apiClient.syncAgentlessPolicies({ dryRun: true });
        expect(apiCalls.length).to.be(1);
        expect(apiCalls.find((call) => call.method === 'GET')).not.to.be(undefined);
      });
    });

    describe('Custom fields (global_data_tags)', () => {
      before(async () => {
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089);
      });

      after(async () => {
        await mockApiServer.close();
      });

      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
        await apiClient.setup();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it('should store global_data_tags on the package policy when creating an agentless policy', async () => {
        const id = uuidv4();

        const policy = await apiClient.createAgentlessPolicy({
          id,
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: `test_agentless-${Date.now()}`,
          description: 'test agentless policy with custom fields',
          namespace: 'default',
          global_data_tags: [
            { name: 'client_id', value: 'acme' },
            { name: 'env', value: 'prod' },
          ],
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

        const packagePolicy = await apiClient.getPackagePolicy(policy.item.id);
        expect(packagePolicy.item.global_data_tags).to.eql([
          { name: 'client_id', value: 'acme' },
          { name: 'env', value: 'prod' },
        ]);

        // Verify the full agent policy contains an add_fields processor with the custom tags
        const { body: fullPolicyBody } = await supertest
          .get(`/api/fleet/agent_policies/${policy.item.id}/full`)
          .auth('elastic', 'changeme')
          .expect(200);

        const inputs = fullPolicyBody.item.inputs as Array<Record<string, any>>;
        const addFieldsProcessors = inputs
          .flatMap((input) => input.processors ?? [])
          .filter((p: any) => p.add_fields != null);

        expect(addFieldsProcessors.length).to.be.greaterThan(0);
        const fields = addFieldsProcessors[0].add_fields.fields;
        expect(fields.client_id).to.be('acme');
        expect(fields.env).to.be('prod');
      });

      it('should update global_data_tags on the package policy when updating', async () => {
        const id = uuidv4();

        const policy = await apiClient.createAgentlessPolicy({
          id,
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: `test_agentless-${Date.now()}`,
          description: 'test agentless policy with custom fields',
          namespace: 'default',
          global_data_tags: [{ name: 'client_id', value: 'original' }],
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

        const packagePolicyBefore = await apiClient.getPackagePolicy(policy.item.id);
        expect(packagePolicyBefore.item.global_data_tags).to.eql([
          { name: 'client_id', value: 'original' },
        ]);

        // Update the package policy with new custom fields
        await apiClient.updatePackagePolicy(policy.item.id, {
          global_data_tags: [{ name: 'client_id', value: 'updated' }],
        } as any);

        const packagePolicyAfter = await apiClient.getPackagePolicy(policy.item.id);
        expect(packagePolicyAfter.item.global_data_tags).to.eql([
          { name: 'client_id', value: 'updated' },
        ]);
      });

      it('should clear global_data_tags and description when omitted on a full-replace PUT', async () => {
        const id = uuidv4();

        const policy = await apiClient.createAgentlessPolicy({
          id,
          package: { name: 'test_agentless', version: '1.0.0' },
          name: `test_agentless-${Date.now()}`,
          description: 'original description',
          namespace: 'default',
          global_data_tags: [{ name: 'client_id', value: 'original' }],
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'TEST_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

        const before = await apiClient.getPackagePolicy(policy.item.id);
        expect(before.item.description).to.be('original description');
        expect(before.item.global_data_tags).to.eql([{ name: 'client_id', value: 'original' }]);

        // Full-replace PUT omitting description + global_data_tags must clear them, not retain.
        await apiClient.updateAgentlessPolicy(policy.item.id, {
          package: { name: 'test_agentless', version: '1.0.0' },
          name: `test_agentless-${Date.now()}`,
          namespace: 'default',
          inputs: {
            'sample-httpjson': {
              enabled: true,
              vars: { api_key: 'TEST_VALUE_API_KEY' },
              streams: {},
            },
          },
        });

        const after = await apiClient.getPackagePolicy(policy.item.id);
        expect(after.item.description || '').to.be('');
        expect(after.item.global_data_tags ?? []).to.eql([]);
      });

      it('should reject global_data_tags on a non-agentless package policy', async () => {
        const agentPolicyRes = await apiClient.createAgentPolicy(undefined, {
          name: `standard-policy-${Date.now()}`,
          namespace: 'default',
          description: '',
        });

        const packagePolicyName = `test_agentless-${Date.now()}`;
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: packagePolicyName,
          namespace: 'default',
          policy_ids: [agentPolicyRes.item.id],
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

        // Try to add global_data_tags to the standard (non-agentless) package policy via update
        await expectToRejectWithError(
          () =>
            supertest
              .put(`/api/fleet/package_policies/${packagePolicyRes.item.id}`)
              .auth('elastic', 'changeme')
              .set('kbn-xsrf', 'xxxx')
              .send({
                global_data_tags: [{ name: 'client_id', value: 'acme' }],
              })
              .then((res) => {
                if (res.status !== 200) {
                  throw new Error(`${res.status} "${res.body?.message ?? 'Unknown error'}"`);
                }
                return res.body;
              }),
          /`global_data_tags` can only be set on agentless integration policies/
        );
      });
    });

    describe('Side effects', () => {
      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();

        await cleanFleetIndices(es);
        await apiClient.setup();
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089); // Start the agentless api mock server on port 8089
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
        mockApiServer.close();
      });
      it('should not allow to update related agent policy', async () => {
        const agentlessPolicy = await apiClient.createAgentlessPolicy({
          id: uuidv4(),
          package: {
            name: 'test_agentless',
            version: '1.0.0',
          },
          name: `Test ${Date.now()}`,
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

        await expectToRejectWithError(
          () =>
            apiClient.putAgentPolicy(agentlessPolicy.item.id, {
              name: 'tata',
              namespace: 'default',
              description: 'tata',
            }),
          /400 "Bad Request" To update managed integrations, use the managed integrations API./
        );
      });
    });

    describe.skip('Agentless Policy with Cloud Connectors', () => {
      // See individual tests for more details
      // Will be resolved in https://github.com/elastic/security-team/issues/14864
      before(async () => {
        const mockAgentlessApiService = setupMockServer();
        mockApiServer = await mockAgentlessApiService.listen(8089);
      });

      after(async () => {
        await mockApiServer.close();
      });

      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
        await apiClient.setup();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
      });

      it.skip('should create agentless policy with AWS cloud connector (requires cloud connector support in test package)', async () => {
        // Will be resolved in https://github.com/elastic/security-team/issues/14864
        // Note: This test is skipped because the test_agentless package doesn't support cloud connectors
        // To enable this test, we would need to:
        // 1. Create a test package with cloud connector support in the deployment_modes
        // 2. Configure the agent policy to enable cloud connectors with target_csp: 'aws'
        // 3. Provide the necessary vars (role_arn, external_id) in the inputs

        const id = uuidv4();

        const policy = await apiClient.createAgentlessPolicy({
          id,
          package: {
            name: 'cloud_security_posture', // Would need to use a real CSP package or create test package
            version: '3.1.1',
          },
          name: `cspm-aws-${Date.now()}`,
          description: 'test agentless policy with AWS cloud connector',
          namespace: 'default',
          inputs: {
            'cspm-cloudbeat/cis_aws': {
              enabled: true,
              streams: {
                'cloud_security_posture.findings': {
                  enabled: true,
                  vars: {
                    role_arn: 'arn:aws:iam::123456789012:role/TestRole',
                    external_id: {
                      id: 'test-external-id',
                      isSecretRef: true,
                    },
                  },
                },
              },
            },
          },
        });

        const packagePolicy = await apiClient.getPackagePolicy(policy.item.id);
        expect(packagePolicy.item.supports_agentless).to.be(true);
        expect(packagePolicy.item.supports_cloud_connector).to.be(true);
        expect(packagePolicy.item.cloud_connector_id).not.to.be(undefined);
      });

      it.skip('should decrement cloud connector package count when deleting agentless policy (requires cloud connector setup)', async () => {
        // Will be resolved in https://github.com/elastic/security-team/issues/14864
        // Note: This test is skipped for the same reasons as above
        // This would test:
        // 1. Create an agentless policy with cloud connector
        // 2. Verify cloud connector packagePolicyCount is 1
        // 3. Delete the agentless policy
        // 4. Verify cloud connector packagePolicyCount is decremented to 0

        const id = uuidv4();

        const policy = await apiClient.createAgentlessPolicy({
          id,
          package: {
            name: 'cloud_security_posture',
            version: '3.1.1',
          },
          name: `cspm-aws-${Date.now()}`,
          description: 'test agentless policy with AWS cloud connector',
          namespace: 'default',
          inputs: {
            'cspm-cloudbeat/cis_aws': {
              enabled: true,
              streams: {
                'cloud_security_posture.findings': {
                  enabled: true,
                  vars: {
                    role_arn: 'arn:aws:iam::123456789012:role/TestRole',
                    external_id: {
                      id: 'test-external-id',
                      isSecretRef: true,
                    },
                  },
                },
              },
            },
          },
        });

        const packagePolicy = await apiClient.getPackagePolicy(policy.item.id);
        const cloudConnectorId = packagePolicy.item.cloud_connector_id;

        // Get cloud connector before deletion
        const cloudConnectorBefore = await supertest
          .get(`/api/fleet/cloud_connectors/${cloudConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(cloudConnectorBefore.body.item.packagePolicyCount).to.be(1);

        // Delete the agentless policy
        await apiClient.deleteAgentlessPolicy(id);

        // Get cloud connector after deletion
        const cloudConnectorAfter = await supertest
          .get(`/api/fleet/cloud_connectors/${cloudConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(cloudConnectorAfter.body.item.packagePolicyCount).to.be(0);
      });
    });
  });
}
