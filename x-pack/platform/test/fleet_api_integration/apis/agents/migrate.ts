/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AGENTS_INDEX, AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { enableActionSecrets } from '../../helpers';
import { checkBulkAgentAction } from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');
  let policy1: any;
  let policy2: any;
  let policy3: any;

  describe('fleet_agents_migrate', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');

      // install with force flag to bypass package verification error
      await supertest
        .post(`/api/fleet/epm/packages/elastic_agent`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({ force: true })
        .expect(200);

      // Create agent policies using the Fleet API
      // Policy 1 - regular policy without tamper protection
      const policy1Response = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Policy 1',
          namespace: 'default',
          description: 'Test policy 1',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);

      policy1 = policy1Response.body.item;

      // Policy 2 - with tamper protection
      const policy2Response = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Policy 2',
          namespace: 'default',
          description: 'Test policy 2 with tamper protection',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);

      policy2 = policy2Response.body.item;

      // First, install the endpoint package which is required for the endpoint package policy
      await supertest
        .post('/api/fleet/epm/packages/endpoint')
        .set('kbn-xsrf', 'xx')
        .send({ force: true })
        .expect(200);

      // Fetch the installed package to get its current version
      const packageInfoResponse = await supertest
        .get('/api/fleet/epm/packages/endpoint')
        .set('kbn-xsrf', 'xx')
        .expect(200);

      const endpointPackageVersion = packageInfoResponse.body.item.version;

      // Create Elastic Defend package policy for policy2 with proper configuration
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'endpoint-1',
          description: 'Endpoint Security Integration',
          namespace: 'default',
          policy_id: policy2.id,
          enabled: true,
          inputs: [
            {
              type: 'endpoint',
              enabled: true,
              streams: [],
              config: {
                policy: {
                  value: {
                    windows: {
                      events: {
                        dll_and_driver_load: true,
                        dns: true,
                        file: true,
                        network: true,
                        process: true,
                        registry: true,
                        security: true,
                      },
                      malware: { mode: 'prevent' },
                      ransomware: { mode: 'prevent' },
                      memory_protection: { mode: 'prevent' },
                      behavior_protection: { mode: 'prevent' },
                      popup: {
                        malware: { enabled: true, message: '' },
                        ransomware: { enabled: true, message: '' },
                      },
                    },
                    mac: {
                      events: { file: true, network: true, process: true },
                      malware: { mode: 'prevent' },
                      behavior_protection: { mode: 'prevent' },
                      popup: { malware: { enabled: true, message: '' } },
                    },
                    linux: {
                      events: { file: true, network: true, process: true },
                      malware: { mode: 'prevent' },
                      behavior_protection: { mode: 'prevent' },
                      popup: { malware: { enabled: true, message: '' } },
                    },
                  },
                },
              },
            },
          ],
          package: {
            name: 'endpoint',
            title: 'Elastic Defend',
            version: endpointPackageVersion, // Use the actual installed version
          },
        })
        .expect(200);

      // Now enable tamper protection on policy2
      await supertest
        .put(`/api/fleet/agent_policies/${policy2.id}`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: policy2.name,
          namespace: 'default',
          description: policy2.description,
          is_protected: true, // Enable tamper protection
        })
        .expect(200);

      // Create agents in Elasticsearch
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent1',
        document: {
          policy_id: policy1.id,
          enrolled_at: new Date().toISOString(),
        },
      });

      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent2',
        document: {
          policy_id: policy2.id, // Policy 2 is tamper protected
        },
      });

      const policy3Response = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Policy 3',
          namespace: 'default',
          description: 'Test policy 3',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);

      policy3 = policy3Response.body.item;

      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent3',
        document: {
          policy_id: policy3.id,
          enrolled_at: new Date().toISOString(),
          components: [
            {
              type: 'fleet-server',
              id: 'fleet-server',
              revision: 1,
            },
          ],
        },
      });

      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent3_91',
        document: {
          policy_id: policy3.id,
          enrolled_at: new Date().toISOString(),
          agent: {
            version: '9.1.0',
          },
        },
      });

      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent4',
        document: {
          policy_id: policy1.id,
          enrolled_at: new Date().toISOString(),
        },
      });
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent5',
        document: {
          policy_id: policy1.id,
          enrolled_at: new Date().toISOString(),
        },
      });

      // Create a containerized agent (upgradeable: false)
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent_containerized',
        document: {
          policy_id: policy1.id,
          enrolled_at: new Date().toISOString(),
          agent: {
            version: '9.2.0',
          },
          local_metadata: {
            elastic: {
              agent: {
                version: '9.2.0',
                upgradeable: false, // Containerized agent
              },
            },
          },
        },
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      // Cleanup will be handled automatically by Fleet API
    });

    describe('POST /agents/{agentId}/migrate', () => {
      it('should return a 200 if the migration action is successful', async () => {
        await enableActionSecrets(providerContext);
        const {} = await supertest
          .post(`/api/fleet/agents/agent1/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(200);

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        // Check type.
        expect(action.type).to.eql('MIGRATE');
        expect(action.data.enrollment_token).to.match(/^\$co\.elastic\.secret{.+}$/);
        // Check secret references.
        expect(Object.keys(action)).to.contain('secret_references');
        expect(action.secret_references).to.have.length(1);
        expect(Object.keys(action.secret_references[0])).to.eql(['id']);
        expect(action.secret_references[0].id).to.be.a('string');
        // Check that secrets is not stored in the action.
        expect(Object.keys(action)).to.not.contain(['secrets']);

        const secretRes = await es.get({
          index: '.fleet-secrets',
          id: action.secret_references[0].id,
        });
        expect(secretRes._source).to.eql({
          value: '1234',
        });
      });

      it('should return a 403 if the agent is tamper protected', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent2/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(403);
      });

      it('should return a 403 if the agent is a fleet-agent', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent3/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(403);
      });

      it('should return a 400 if the agent is an unsupported version', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent3_91/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(400);
      });

      it('should return a 400 if the agent is containerized', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent_containerized/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(400);
      });

      it('should return a 404 when agent does not exist', async () => {
        await supertest
          .post(`/api/fleet/agents/agent100/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(404);
      });
    });

    // Bulk migrate agents
    describe('POST /agents/bulk_migrate', () => {
      it('should return a 200 if the migration action is successful', async () => {
        await enableActionSecrets(providerContext);
        const {} = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(200);

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        // Check type.
        expect(action.type).to.eql('MIGRATE');
        expect(action.data.enrollment_token).to.match(/^\$co\.elastic\.secret{.+}$/);
        // Check secret references.
        expect(Object.keys(action)).to.contain('secret_references');
        expect(action.secret_references).to.have.length(1);
        expect(Object.keys(action.secret_references[0])).to.eql(['id']);
        expect(action.secret_references[0].id).to.be.a('string');
        // Check that secrets is not stored in the action.
        expect(Object.keys(action)).to.not.contain(['secrets']);
      });

      it('should return a 200 if any agent is tamper protected', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent2'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(200);

        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];
        expect(actionStatus.nbAgentsFailed).to.eql(1);
        expect(actionStatus.latestErrors[0].error).to.eql(
          'Agent agent2 cannot be migrated because it is protected.'
        );
      });

      it('should return a 200 if any agent is a fleet-agent', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent3'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(200);

        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];
        expect(actionStatus.nbAgentsFailed).to.eql(1);
        expect(actionStatus.latestErrors[0].error).to.eql(
          'Agent agent3 cannot be migrated because it is a fleet-server.'
        );
      });

      it('should return a 200 if any agent is containerized', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent_containerized'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(200);

        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];
        expect(actionStatus.nbAgentsFailed).to.eql(1);
        expect(actionStatus.latestErrors[0].error).to.eql(
          'Agent agent_containerized cannot be migrated because it is containerized.'
        );
      });

      async function verifyActionResult(agentCount: number) {
        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];

        expect(actionStatus.nbAgentsActionCreated).to.eql(agentCount);
      }

      it('/agents/bulk_migrate should work for multiple agents by kuery', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: `policy_id: "${policy1.id}"`,
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(200);

        await verifyActionResult(3);
      });

      it('/agents/bulk_migrate should work for multiple agents by kuery in batches async', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: `policy_id: "${policy1.id}"`,
            batchSize: 2,
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(200);

        const actionId = body.actionId;
        await checkBulkAgentAction(supertest, actionId);
      });
    });
  });
}
