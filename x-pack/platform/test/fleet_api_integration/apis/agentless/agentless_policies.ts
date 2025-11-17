/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect/expect';
import type * as http from 'http';
import { v4 as uuidv4 } from 'uuid';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupMockServer } from '../agents/helpers/mock_agentless_api';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import {
  cleanFleetIndices,
  expectToRejectWithError,
  expectToRejectWithNotFound,
} from '../space_awareness/helpers';

export default function (providerContext: FtrProviderContext) {
  describe('Agentless Policies', () => {
    const { getService } = providerContext;
    const es = getService('es');
    const supertest = getService('supertest');

    const kibanaServer = getService('kibanaServer');

    skipIfNoDockerRegistry(providerContext);

    const apiClient = new SpaceTestApiClient(supertest);

    let mockApiServer: http.Server;
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
    });

    describe('Sync Agentless Policies', () => {
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

      let apiCalls: Array<{
        url: string;
        method: string;
        data?: any;
      }> = [];
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
  });
}
