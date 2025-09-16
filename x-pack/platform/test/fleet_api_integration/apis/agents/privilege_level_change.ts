/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX, AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Agent Privilege Level Change API', () => {
    before(async () => {
      // Not strictly necessary, but allows automatic cleanup.
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');

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
      const policy1 = policyRes.body.item;
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
      const policy2 = policyRes.body.item;

      // Install integrations.
      // Nginx integration doesn't need root access.
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
      // System integration needs root access.
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
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent1',
        document: {
          policy_id: policy1.id, // nginx, no root access needed
        },
      });
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent2',
        document: {
          policy_id: policy2.id, // system, root access needed
        },
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
    });

    describe('POST /api/fleet/agents/{agentId}/privilege_level_change', () => {
      it('should return 200 if the PRIVILEGE_LEVEL_CHANGE action was created', async () => {
        await supertest
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

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });
        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.type).to.eql('PRIVILEGE_LEVEL_CHANGE');
        expect(action.data).to.eql({
          userInfo: { username: 'user1', groupname: 'group1', password: 'password' },
          unprivileged: true,
        });
      });

      it('should return 403 if agent needs root access', async () => {
        await supertest
          .post(`/api/fleet/agents/agent2/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send()
          .expect(403);
      });

      it('should return 404 if the agent does not exist', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1337/privilege_level_change`)
          .set('kbn-xsrf', 'xx')
          .send()
          .expect(404);
      });
    });
  });
}
