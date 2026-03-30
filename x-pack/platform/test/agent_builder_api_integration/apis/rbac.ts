/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { publicApiPath } from '@kbn/agent-builder-plugin/common/constants';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { spaceUrl } from '../utils/spaces';

const API_VERSION = '2023-10-31';

function mockAgent(id: string, toolIds: string[] = ['*']) {
  return {
    id,
    name: 'RBAC Fixture Agent',
    description: 'Fixture for RBAC tests',
    configuration: {
      instructions: 'Test agent',
      tools: [{ tool_ids: toolIds }],
    },
  };
}

function mockToolEsql(id: string) {
  return {
    id,
    type: 'esql' as const,
    description: 'Fixture for RBAC tests',
    tags: [] as string[],
    configuration: {
      query: 'FROM my_index | LIMIT 1',
      params: {} as Record<string, { type: string; description: string }>,
    },
  };
}

/** Prefix used to generate per-run unique resources and avoid cross-test collisions. */
const RBAC_TEST_PREFIX = 'rbac-test';

function mockToolIndexSearch(id: string, indexName: string) {
  return {
    id,
    type: 'index_search' as const,
    description: 'RBAC test tool',
    tags: [] as string[],
    configuration: {
      pattern: indexName,
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

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const spaces = getService('spaces');
  const es = getService('es');
  const randomness = getService('randomness');
  const testRunId = uuidv4();
  const rbacSpaceId = `${RBAC_TEST_PREFIX}-space-${testRunId}`;
  const rbacApiBase = spaceUrl(publicApiPath, rbacSpaceId);

  function makeRoleAndUserNames(scope: string) {
    return {
      roleName: `${RBAC_TEST_PREFIX}-${scope}-role-${testRunId}`,
      username: `${RBAC_TEST_PREFIX}-${scope}-user-${testRunId}`,
    };
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
          spaces: [rbacSpaceId],
        },
      ],
    };
  }

  async function deleteSecurityUserAndRole(username: string, roleName: string) {
    await security.user.delete(username);
    await security.role.delete(roleName);
  }

  describe('Agent Builder RBAC: manage_agents and manage_tools sub-features', function () {
    this.tags(['skipServerless']); // only run on stateful because serverless doesn't support user and roles management
    const rbacTestIndex = `${RBAC_TEST_PREFIX}-index-${testRunId}`;

    const fixtureAgentId = `${RBAC_TEST_PREFIX}-fixture-agent-${testRunId}`;
    const fixtureToolId = `${RBAC_TEST_PREFIX}-fixture-tool-${testRunId}`;

    const readOnlyPrincipal = makeRoleAndUserNames('read-only');
    const manageAgentsPrincipal = makeRoleAndUserNames('manage-agents');
    const manageToolsPrincipal = makeRoleAndUserNames('manage-tools');
    const allPrincipal = makeRoleAndUserNames('all');

    before(async () => {
      await spaces.create({
        id: rbacSpaceId,
        name: rbacSpaceId,
        disabledFeatures: [],
      });

      await es.indices.create({ index: rbacTestIndex });

      await supertest
        .post(`${rbacApiBase}/tools`)
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', API_VERSION)
        .send(mockToolIndexSearch(fixtureToolId, rbacTestIndex))
        .expect(200);

      await supertest
        .post(`${rbacApiBase}/agents`)
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', API_VERSION)
        .send(mockAgent(fixtureAgentId, [fixtureToolId]))
        .expect(200);
    });

    after(async () => {
      await supertest
        .delete(`${rbacApiBase}/agents/${fixtureAgentId}`)
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', API_VERSION)
        .expect([200, 404]);
      await supertest
        .delete(`${rbacApiBase}/tools/${fixtureToolId}`)
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', API_VERSION)
        .expect([200, 404]);

      await deleteSecurityUserAndRole(readOnlyPrincipal.username, readOnlyPrincipal.roleName);
      await deleteSecurityUserAndRole(
        manageAgentsPrincipal.username,
        manageAgentsPrincipal.roleName
      );
      await deleteSecurityUserAndRole(manageToolsPrincipal.username, manageToolsPrincipal.roleName);
      await deleteSecurityUserAndRole(allPrincipal.username, allPrincipal.roleName);

      await es.indices.delete({ index: rbacTestIndex });
      await spaces.delete(rbacSpaceId);
    });

    describe('user with minimal_read only (no manage_agents, no manage_tools)', () => {
      const roleName = readOnlyPrincipal.roleName;
      const username = readOnlyPrincipal.username;
      const password = 'read-only-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['minimal_read']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder read-only user',
        });
      });

      it('can GET /api/agent_builder/agents', async () => {
        const res = await supertestWithoutAuth
          .get(rbacApiBase + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('can GET /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .get(`${rbacApiBase}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('can GET /api/agent_builder/tools', async () => {
        const res = await supertestWithoutAuth
          .get(rbacApiBase + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('can GET /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .get(`${rbacApiBase}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(200);
      });

      it('cannot POST /api/agent_builder/agents', async () => {
        const res = await supertestWithoutAuth
          .post(rbacApiBase + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockAgent(`${RBAC_TEST_PREFIX}-readonly-create-agent-${testRunId}`));
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${rbacApiBase}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ name: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${rbacApiBase}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });

      it('cannot POST /api/agent_builder/tools', async () => {
        const res = await supertestWithoutAuth
          .post(rbacApiBase + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockToolEsql(`${RBAC_TEST_PREFIX}-readonly-create-tool-${testRunId}`));
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${rbacApiBase}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ description: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${rbacApiBase}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });
    });

    describe('user with minimal_read + manage_agents (no manage_tools)', () => {
      const roleName = manageAgentsPrincipal.roleName;
      const username = manageAgentsPrincipal.username;
      const password = 'manage-agents-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['minimal_read', 'manage_agents']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder manage agents only user',
        });
      });

      it('can create, update, and delete an agent', async () => {
        const agentId = `rbac-manage-agents-created-agent-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(rbacApiBase + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockAgent(agentId));
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(agentId);

        const updateRes = await supertestWithoutAuth
          .put(`${rbacApiBase}/agents/${agentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ name: 'Updated by manage_agents user' });
        expect(updateRes.status).to.be(200);

        const deleteRes = await supertestWithoutAuth
          .delete(`${rbacApiBase}/agents/${agentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });

      it('cannot POST /api/agent_builder/tools', async () => {
        const res = await supertestWithoutAuth
          .post(rbacApiBase + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockToolEsql(`${RBAC_TEST_PREFIX}-manage-agents-create-tool-${testRunId}`));
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${rbacApiBase}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ description: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/tools/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${rbacApiBase}/tools/${fixtureToolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });
    });

    describe('user with minimal_read + manage_tools (no manage_agents)', () => {
      const roleName = manageToolsPrincipal.roleName;
      const username = manageToolsPrincipal.username;
      const password = 'manage-tools-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['minimal_read', 'manage_tools']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder manage tools only user',
        });
      });

      it('can create, update, and delete a tool', async () => {
        const toolId = `rbac-manage-tools-created-tool-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(rbacApiBase + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockToolIndexSearch(toolId, rbacTestIndex));
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(toolId);

        const updateRes = await supertestWithoutAuth
          .put(`${rbacApiBase}/tools/${toolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ description: 'Updated by manage_tools user' });
        expect(updateRes.status).to.be(200);

        const deleteRes = await supertestWithoutAuth
          .delete(`${rbacApiBase}/tools/${toolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });

      it('cannot POST /api/agent_builder/agents', async () => {
        const res = await supertestWithoutAuth
          .post(rbacApiBase + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockAgent(`${RBAC_TEST_PREFIX}-manage-tools-create-agent-${testRunId}`));
        expect(res.status).to.be(403);
      });

      it('cannot PUT /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .put(`${rbacApiBase}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({ name: 'Updated' });
        expect(res.status).to.be(403);
      });

      it('cannot DELETE /api/agent_builder/agents/:id', async () => {
        const res = await supertestWithoutAuth
          .delete(`${rbacApiBase}/agents/${fixtureAgentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(res.status).to.be(403);
      });
    });

    describe('user with agentBuilder all', () => {
      const roleName = allPrincipal.roleName;
      const username = allPrincipal.username;
      const password = 'all-password';

      before(async () => {
        await security.role.create(roleName, agentBuilderRole(['all']));
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Agent Builder all user',
        });
      });

      it('can create and delete an agent', async () => {
        const agentId = `rbac-all-created-agent-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(rbacApiBase + '/agents')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockAgent(agentId));
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(agentId);

        const deleteRes = await supertestWithoutAuth
          .delete(`${rbacApiBase}/agents/${agentId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });

      it('can create and delete a tool', async () => {
        const toolId = `rbac-all-created-tool-${randomness.naturalNumber()}`;
        const createRes = await supertestWithoutAuth
          .post(rbacApiBase + '/tools')
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(mockToolIndexSearch(toolId, rbacTestIndex));
        expect(createRes.status).to.be(200);
        expect(createRes.body.id).to.be(toolId);

        const deleteRes = await supertestWithoutAuth
          .delete(`${rbacApiBase}/tools/${toolId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION);
        expect(deleteRes.status).to.be(200);
      });
    });
  });
}
