/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

const API_BASE = '/api/agent_builder';
/** Version for Agent Builder public API (versioned routes require this header). */
const API_VERSION = '2023-10-31';

const MOCK_AGENT = {
  id: 'rbac-fixture-agent',
  name: 'RBAC Fixture Agent',
  description: 'Fixture for RBAC tests',
  configuration: {
    instructions: 'Test agent',
    tools: [{ tool_ids: ['*'] }],
  },
};

const MOCK_TOOL_ESQL = {
  id: 'rbac-fixture-tool',
  type: 'esql' as const,
  description: 'Fixture for RBAC tests',
  tags: [] as string[],
  configuration: {
    query: 'FROM my_index | LIMIT 1',
    params: {} as Record<string, { type: string; description: string }>,
  },
};

/** Index that must exist so index_search tool validation (pattern must match at least one source) passes. */
const RBAC_TEST_INDEX = 'rbac-test-index';

/** index_search avoids ESQL query/param validation; use for RBAC-created tools. */
function mockToolIndexSearch(id: string) {
  return {
    id,
    type: 'index_search' as const,
    description: 'RBAC test tool',
    tags: [] as string[],
    configuration: {
      pattern: RBAC_TEST_INDEX,
    },
  };
}

interface KibanaRole {
  elasticsearch?: { cluster?: string[]; indices?: unknown[]; run_as?: string[] };
  kibana?: Array<{
    base?: string[];
    feature?: Record<string, string[]>;
    spaces: string[];
  }>;
}

function agentBuilderRole(privileges: string[]): KibanaRole {
  return {
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [
      {
        base: [],
        feature: {
          agentBuilder: privileges,
          actions: ['read'],
        },
        spaces: ['*'],
      },
    ],
  };
}

export default function rbacTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const log = getService('log');
  const es = getService('es');
  const randomness = getService('randomness');

  describe('Agent Builder RBAC: manage_agents and manage_tools sub-features', () => {
    let fixtureAgentId: string;
    let fixtureToolId: string;

    before(async () => {
      await es.indices.create({ index: RBAC_TEST_INDEX });

      const agentRes = await supertest
        .post(`${API_BASE}/agents`)
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', API_VERSION)
        .send(MOCK_AGENT)
        .expect(200);
      fixtureAgentId = agentRes.body.id;

      const toolRes = await supertest
        .post(`${API_BASE}/tools`)
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', API_VERSION)
        .send(MOCK_TOOL_ESQL)
        .expect(200);
      fixtureToolId = toolRes.body.id;
    });

    after(async () => {
      try {
        await supertest
          .delete(`${API_BASE}/agents/${fixtureAgentId}`)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
      } catch (e) {
        log.warning(`RBAC cleanup: failed to delete agent ${fixtureAgentId}: ${e}`);
      }
      try {
        await supertest
          .delete(`${API_BASE}/tools/${fixtureToolId}`)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
      } catch (e) {
        log.warning(`RBAC cleanup: failed to delete tool ${fixtureToolId}: ${e}`);
      }
      try {
        await es.indices.delete({ index: RBAC_TEST_INDEX });
      } catch (e) {
        log.warning(`RBAC cleanup: failed to delete index ${RBAC_TEST_INDEX}: ${e}`);
      }
    });

    describe('user with minimal_read only (no manage_agents, no manage_tools)', () => {
      const roleName = 'ab_rbac_read_only';
      const username = 'ab_rbac_read_only_user';
      const password = 'read-only-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['minimal_read']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder read-only user',
        });
      });

      after(async () => {
        await security.user.delete(username);
        await security.role.delete(roleName);
      });

      it('can GET /api/agent_builder/agents', async () => {
        const res = await supertestWithoutAuth
          .get(API_BASE + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('can GET /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .get(`${API_BASE}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('can GET /api/agent_builder/tools', async () => {
        const res = await supertestWithoutAuth
          .get(API_BASE + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('can GET /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .get(`${API_BASE}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('cannot POST /api/agent_builder/agents', async () => {
        const res = await supertestWithoutAuth
          .post(API_BASE + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ ...MOCK_AGENT, id: 'rbac-readonly-create-agent' });
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${API_BASE}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ name: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${API_BASE}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });

      it('cannot POST /api/agent_builder/tools', async () => {
        const res = await supertestWithoutAuth
          .post(API_BASE + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ ...MOCK_TOOL_ESQL, id: 'rbac-readonly-create-tool' });
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${API_BASE}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ description: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${API_BASE}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });
    });

    describe('user with minimal_read + manage_agents (no manage_tools)', () => {
      const roleName = 'ab_rbac_manage_agents_only';
      const username = 'ab_rbac_manage_agents_only_user';
      const password = 'manage-agents-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['minimal_read', 'manage_agents']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder manage agents only user',
        });
      });

      after(async () => {
        await security.user.delete(username);
        await security.role.delete(roleName);
      });

      it('can create, update, and delete an agent', async () => {
        const agentId = `rbac-manage-agents-created-agent-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(API_BASE + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ ...MOCK_AGENT, id: agentId });
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(agentId);

        const updateRes = await supertestWithoutAuth
          .put(`${API_BASE}/agents/${agentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ name: 'Updated by manage_agents user' });
        expect(updateRes.status).to.be(200);

        const deleteRes = await supertestWithoutAuth
          .delete(`${API_BASE}/agents/${agentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });

      it('cannot POST /api/agent_builder/tools', async () => {
        const res = await supertestWithoutAuth
          .post(API_BASE + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ ...MOCK_TOOL_ESQL, id: 'rbac-manage-agents-create-tool' });
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${API_BASE}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ description: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${API_BASE}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });
    });

    describe('user with minimal_read + manage_tools (no manage_agents)', () => {
      const roleName = 'ab_rbac_manage_tools_only';
      const username = 'ab_rbac_manage_tools_only_user';
      const password = 'manage-tools-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['minimal_read', 'manage_tools']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder manage tools only user',
        });
      });

      after(async () => {
        await security.user.delete(username);
        await security.role.delete(roleName);
      });

      it('can create, update, and delete a tool', async () => {
        const toolId = `rbac-manage-tools-created-tool-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(API_BASE + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockToolIndexSearch(toolId));
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(toolId);

        const updateRes = await supertestWithoutAuth
          .put(`${API_BASE}/tools/${toolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ description: 'Updated by manage_tools user' });
        expect(updateRes.status).to.be(200);

        const deleteRes = await supertestWithoutAuth
          .delete(`${API_BASE}/tools/${toolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });

      it('cannot POST /api/agent_builder/agents', async () => {
        const res = await supertestWithoutAuth
          .post(API_BASE + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ ...MOCK_AGENT, id: 'rbac-manage-tools-create-agent' });
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${API_BASE}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ name: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${API_BASE}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });
    });

    describe('user with agentBuilder all', () => {
      const roleName = 'ab_rbac_all';
      const username = 'ab_rbac_all_user';
      const password = 'all-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['all']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder all user',
        });
      });

      after(async () => {
        await security.user.delete(username);
        await security.role.delete(roleName);
      });

      it('can create and delete an agent', async () => {
        const agentId = `rbac-all-created-agent-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(API_BASE + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ ...MOCK_AGENT, id: agentId });
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(agentId);

        const deleteRes = await supertestWithoutAuth
          .delete(`${API_BASE}/agents/${agentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });

      it('can create and delete a tool', async () => {
        const toolId = `rbac-all-created-tool-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(API_BASE + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockToolIndexSearch(toolId));
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(toolId);

        const deleteRes = await supertestWithoutAuth
          .delete(`${API_BASE}/tools/${toolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });
    });
  });
}
