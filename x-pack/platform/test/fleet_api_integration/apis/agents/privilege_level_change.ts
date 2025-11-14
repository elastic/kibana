/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX, AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { disableActionSecrets, enableActionSecrets } from '../../helpers';
import { checkBulkAgentAction } from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');
  let policy1: any;
  let policy2: any;

  async function verifyActionResult(agentCount: number) {
    const { body } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');
    const actionStatus = body.items[0];
    expect(actionStatus.nbAgentsActioned).to.eql(agentCount);
  }

  describe('fleet_agents_change_privilege_level', () => {
    before(async () => {
      // Not strictly necessary, but allows automatic cleanup.
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      const enrolledTime = new Date(Date.now() - 1000 * 60).toISOString();

      // Create agent policies.
      let policyRes = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Agent policy 1',
          namespace: 'default',
          description: 'Test policy 1',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);
      policy1 = policyRes.body.item;
      policyRes = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Agent policy 2',
          namespace: 'default',
          description: 'Test policy 2',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);
      policy2 = policyRes.body.item;

      // Install integrations.
      // Nginx integration doesn't need root privilege.
      await supertest
        .post('/api/fleet/epm/packages/nginx')
        .set('kbn-xsrf', 'xx')
        .send({ force: true })
        .expect(200);
      let packageInfoRes = await supertest
        .get('/api/fleet/epm/packages/nginx')
        .set('kbn-xsrf', 'xx')
        .expect(200);
      const nginxPackageVersion = packageInfoRes.body.item.version;
      // System integration needs root privilege.
      await supertest
        .post('/api/fleet/epm/packages/system')
        .set('kbn-xsrf', 'xx')
        .send({ force: true })
        .expect(200);
      packageInfoRes = await supertest
        .get('/api/fleet/epm/packages/system')
        .set('kbn-xsrf', 'xx')
        .expect(200);
      const systemPackageVersion = packageInfoRes.body.item.version;

      // Create package policies.
      await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'nginx-1',
          namespace: 'default',
          policy_ids: [policy1.id],
          package: {
            name: 'nginx',
            version: nginxPackageVersion,
          },
          inputs: {},
        });
      await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'system-1',
          namespace: 'default',
          policy_ids: [policy2.id],
          package: {
            name: 'system',
            version: systemPackageVersion,
          },
          inputs: {},
        });

      // Create agents.
      // Eligible for privilege level change: agent1, agent2, agent3
      for (let i = 1; i <= 3; i++) {
        await es.index({
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          id: `agent${i}`,
          document: {
            agent: { version: '9.3.0' }, // supported version
            local_metadata: {
              elastic: {
                agent: {
                  unprivileged: false, // root privilege
                },
              },
            },
            policy_id: policy1.id, // nginx, no root privilege needed
            enrolled_at: enrolledTime,
          },
        });
      }
      // Not eligible for privilege level change: agent4 (already unprivileged)
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent4',
        document: {
          agent: { version: '9.3.0' }, // supported version
          local_metadata: {
            elastic: {
              agent: {
                unprivileged: true, // unprivileged
              },
            },
          },
          policy_id: policy1.id, // nginx, no root privilege needed
          enrolled_at: enrolledTime,
        },
      });
      // Not eligible for privilege level change: agent5 (unsupported version)
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent5',
        document: {
          agent: { version: '9.1.0' }, // unsupported version
          local_metadata: {
            elastic: {
              agent: {
                unprivileged: false, // root privilege
              },
            },
          },
          policy_id: policy1.id, // nginx, no root privilege needed
          enrolled_at: enrolledTime,
        },
      });
      // Not eligible for privilege level change: agent6 (needs root privilege)
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent6',
        document: {
          agent: { version: '9.3.0' }, // supported version
          local_metadata: {
            elastic: {
              agent: {
                unprivileged: false, // root privilege
              },
            },
          },
          policy_id: policy2.id, // system, root privilege needed
          enrolled_at: enrolledTime,
        },
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
    });

    describe('POST /api/fleet/agents/{agentId}/privilege_level_change', () => {
      it('should return 200 if a PRIVILEGE_LEVEL_CHANGE action was created without secrets', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent1/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send({
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);
        expect(res.body).to.have.property('actionId');
        expect(res.body).to.not.have.property('message');

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.type).to.eql('PRIVILEGE_LEVEL_CHANGE');
        expect(action.data).to.eql({
          user_info: { username: 'user1', groupname: 'group1', password: 'password' },
          unprivileged: true,
        });
      });

      it('should return 200 if a PRIVILEGE_LEVEL_CHANGE action was created with secrets', async () => {
        await enableActionSecrets(providerContext);
        const res = await supertest
          .post(`/api/fleet/agents/agent1/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send({
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);
        expect(res.body).to.have.property('actionId');
        expect(res.body).to.not.have.property('message');

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        // Check type.
        expect(action.type).to.eql('PRIVILEGE_LEVEL_CHANGE');
        // Check data and that password was replaced by a secret reference.
        expect(Object.keys(action.data)).to.eql(['unprivileged', 'user_info']);
        expect(action.data.unprivileged).to.eql(true);
        expect(Object.keys(action.data.user_info)).to.eql(['username', 'groupname', 'password']);
        expect(action.data.user_info.username).to.eql('user1');
        expect(action.data.user_info.groupname).to.eql('group1');
        expect(action.data.user_info.password).to.match(/^\$co\.elastic\.secret{.+}$/);
        // Check secret references.
        expect(Object.keys(action)).to.contain('secret_references');
        expect(action.secret_references).to.have.length(1);
        expect(Object.keys(action.secret_references[0])).to.eql(['id']);
        expect(action.secret_references[0].id).to.be.a('string');
        // Check that secrets is not stored in the action.
        expect(Object.keys(action)).to.not.contain(['secrets']);
      });

      it('should return 200 if agent is already unprivileged', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent4/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send({
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);
        expect(res.body).to.not.have.property('actionId');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.eql('Agent agent4 is already unprivileged');
      });

      it('should return 400 if agent is on an unsupported version', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent5/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send()
          .expect(400);
        expect(res.body.message).to.eql(
          'Cannot remove root privilege. Privilege level change is supported from version 9.3.0.'
        );
      });

      it('should return 403 if agent needs root privilege', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent6/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send()
          .expect(403);
        expect(res.body.message).to.eql(
          `Agent agent6 is on policy ${policy2.id}, which contains integrations that require root privilege: system`
        );
      });

      it('should return 404 if the agent does not exist', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1337/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send()
          .expect(404);
      });
    });

    describe('POST /api/fleet/agents/bulk_privilege_level_change', () => {
      it('should return 200 if a PRIVILEGE_LEVEL_CHANGE action was created for a list of agent ids', async () => {
        await disableActionSecrets(providerContext);
        await supertest
          .post(`/api/fleet/agents/bulk_privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent2'],
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.type).to.eql('PRIVILEGE_LEVEL_CHANGE');
        expect(action.data).to.eql({
          user_info: {
            username: 'user1',
            groupname: 'group1',
            password: 'password',
          },
          unprivileged: true,
        });
        await verifyActionResult(2);
      });

      it('should return 200 if a PRIVILEGE_LEVEL_CHANGE action with secrets was created for a list of agent ids', async () => {
        await enableActionSecrets(providerContext);
        await supertest
          .post(`/api/fleet/agents/bulk_privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent2'],
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);
        await verifyActionResult(2);
        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        // Check type.
        expect(action.type).to.eql('PRIVILEGE_LEVEL_CHANGE');
        // Check data and that password was replaced by a secret reference.
        expect(Object.keys(action.data)).to.eql(['unprivileged', 'user_info']);
        expect(action.data.unprivileged).to.eql(true);
        expect(Object.keys(action.data.user_info)).to.eql(['username', 'groupname', 'password']);
        expect(action.data.user_info.username).to.eql('user1');
        expect(action.data.user_info.groupname).to.eql('group1');
        expect(action.data.user_info.password).to.match(/^\$co\.elastic\.secret{.+}$/);
        // Check secret references.
        expect(Object.keys(action)).to.contain('secret_references');
        expect(action.secret_references).to.have.length(1);
        expect(Object.keys(action.secret_references[0])).to.eql(['id']);
        expect(action.secret_references[0].id).to.be.a('string');
        // Check that secrets is not stored in the action.
        expect(Object.keys(action)).to.not.contain(['secrets']);
      });

      it('should return 200 if a PRIVILEGE_LEVEL_CHANGE action was created for an agent kuery', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_privilege_level_change`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: `policy_id: "${policy1.id}"`,
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);
        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.type).to.eql('PRIVILEGE_LEVEL_CHANGE');
        expect(action.agents.length).to.eql(4);
        expect(action.total).to.eql(5);
        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];
        expect(actionStatus.nbAgentsActioned).to.eql(5);
        expect(actionStatus.nbAgentsActionCreated).to.eql(4);
        expect(actionStatus.nbAgentsFailed).to.eql(1);
      });

      it('should return 200 and create a PRIVILEGE_LEVEL_CHANGE action with errors if some agents are not eligible for privilege level change', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent5', 'agent6'],
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);
        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];
        expect(actionStatus.nbAgentsActioned).to.eql(3);
        expect(actionStatus.nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.nbAgentsFailed).to.eql(2);
        expect(actionStatus.latestErrors.length).to.eql(2);
        expect(
          actionStatus.latestErrors.find((error: any) => error.agentId === 'agent5').error
        ).to.eql(
          'Cannot remove root privilege. Privilege level change is supported from version 9.3.0.'
        );
        expect(
          actionStatus.latestErrors.find((error: any) => error.agentId === 'agent6').error
        ).to.eql(
          `Agent agent6 is on policy ${policy2.id}, which contains integrations that require root privilege: system`
        );
      });

      it('should work for multiple agents by kuery in batches async', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_privilege_level_change`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: `policy_id: "${policy1.id}"`,
            batchSize: 2,
            user_info: {
              username: 'user1',
              groupname: 'group1',
              password: 'password',
            },
          })
          .expect(200);
        const actionId = body.actionId;
        await checkBulkAgentAction(supertest, actionId);
      });
    });
  });
}
