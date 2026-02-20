/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Agent } from 'supertest';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const TOOL_USED_BY_AGENTS_ERROR_CODE = 'TOOL_USED_BY_AGENTS';

const IDS = {
  public: {
    toolInUse: 'ftr-tool-delete-force-public',
    toolUnused: 'ftr-tool-unused',
    agent: 'ftr-agent-uses-tool-public',
  },
  bulk: {
    tools: ['ftr-tool-bulk-1', 'ftr-tool-bulk-2'],
    agent: 'ftr-agent-uses-tool-bulk',
  },
} as const;

function esqlToolPayload(id: string, description: string) {
  return {
    id,
    type: 'esql',
    description,
    tags: [] as string[],
    configuration: {
      query: 'FROM .kibana | LIMIT 1',
      params: {} as Record<string, { type: string; description: string }>,
    },
  };
}

async function deleteAgentIgnoringErrors(
  supertest: Agent,
  agentId: string,
  log: { warning: (msg: string) => void }
) {
  try {
    const res = await supertest
      .delete(`/api/agent_builder/agents/${agentId}`)
      .set('kbn-xsrf', 'kibana');
    if (res.status !== 200 && res.status !== 404) {
      log.warning(`Cleanup agent ${agentId}: ${res.status} ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    log.warning(`Cleanup agent ${agentId}: ${e}`);
  }
}

async function deleteToolIgnoringErrors(
  supertest: Agent,
  toolId: string,
  log: { warning: (msg: string) => void }
) {
  try {
    const res = await supertest
      .delete(`/api/agent_builder/tools/${toolId}?force=true`)
      .set('kbn-xsrf', 'kibana');
    if (res.status !== 200 && res.status !== 404) {
      log.warning(`Cleanup tool ${toolId}: ${res.status} ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    log.warning(`Cleanup tool ${toolId}: ${e}`);
  }
}

async function ensureNoAgentOrTools(
  supertest: Agent,
  agentId: string,
  toolIds: readonly string[]
): Promise<void> {
  await supertest
    .delete(`/api/agent_builder/agents/${agentId}`)
    .set('kbn-xsrf', 'kibana')
    .catch(() => {});
  for (const id of toolIds) {
    await supertest
      .delete(`/api/agent_builder/tools/${id}?force=true`)
      .set('kbn-xsrf', 'kibana')
      .catch(() => {});
  }
}

async function createTool(supertest: Agent, id: string, description: string) {
  await supertest
    .post('/api/agent_builder/tools')
    .set('kbn-xsrf', 'kibana')
    .send(esqlToolPayload(id, description))
    .expect(200);
}

async function createAgentWithTools(
  supertest: Agent,
  agentId: string,
  name: string,
  toolIds: readonly string[]
) {
  await supertest
    .post('/api/agent_builder/agents')
    .set('kbn-xsrf', 'kibana')
    .send({
      id: agentId,
      name,
      description: 'FTR agent for tool delete tests',
      configuration: {
        instructions: 'Test',
        tools: [{ tool_ids: toolIds }],
      },
    })
    .expect(200);
}

function expectConflictWithAgents(response: { body: any }) {
  expect(response.body).to.have.property('message');
  expect(response.body.message).to.contain('used by');
  expect(response.body).to.have.property('attributes');
  expect(response.body.attributes).to.have.property('code', TOOL_USED_BY_AGENTS_ERROR_CODE);
  expect(response.body.attributes).to.have.property('agents');
  expect(response.body.attributes.agents).to.be.an('array');
  expect(response.body.attributes.agents.length).to.be.greaterThan(0);
  const agent = response.body.attributes.agents[0];
  expect(agent).to.have.property('id');
  expect(agent).to.have.property('name');
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('Tool delete (force and agents in use)', () => {
    after(async () => {
      await deleteAgentIgnoringErrors(supertest, IDS.public.agent, log);
      await deleteAgentIgnoringErrors(supertest, IDS.bulk.agent, log);
      for (const id of [IDS.public.toolInUse, IDS.public.toolUnused, ...IDS.bulk.tools]) {
        await deleteToolIgnoringErrors(supertest, id, log);
      }
    });

    describe('DELETE /api/agent_builder/tools/:id (public)', () => {
      before(async () => {
        await ensureNoAgentOrTools(supertest, IDS.public.agent, [
          IDS.public.toolInUse,
          IDS.public.toolUnused,
        ]);
        await createTool(supertest, IDS.public.toolInUse, 'FTR tool for delete force tests');
        await createTool(supertest, IDS.public.toolUnused, 'FTR tool not used by any agent');
        await createAgentWithTools(supertest, IDS.public.agent, 'FTR Agent Using Tool', [
          IDS.public.toolInUse,
        ]);
      });

      it('returns 200 when tool is not used by any agent and force is not set', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/tools/${IDS.public.toolUnused}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);
        expect(response.body).to.have.property('success', true);
      });

      it('returns 409 with agents list when tool is in use and force is not set', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/tools/${IDS.public.toolInUse}`)
          .set('kbn-xsrf', 'kibana')
          .expect(409);
        expectConflictWithAgents(response);
      });

      it('returns 200 and deletes tool when force=true', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/tools/${IDS.public.toolInUse}?force=true`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);
        expect(response.body).to.have.property('success', true);
        await supertest.get(`/api/agent_builder/tools/${IDS.public.toolInUse}`).expect(404);
      });
    });

    describe('POST /internal/agent_builder/tools/_bulk_delete (internal)', () => {
      before(async () => {
        await ensureNoAgentOrTools(supertest, IDS.bulk.agent, IDS.bulk.tools);
        for (const id of IDS.bulk.tools) {
          await createTool(supertest, id, `FTR bulk delete tool ${id}`);
        }
        await createAgentWithTools(
          supertest,
          IDS.bulk.agent,
          'FTR Agent Using Bulk Tools',
          IDS.bulk.tools
        );
      });

      it('returns 409 with TOOL_USED_BY_AGENTS when any tool is in use and force=false', async () => {
        const response = await supertest
          .post('/internal/agent_builder/tools/_bulk_delete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ ids: IDS.bulk.tools, force: false })
          .expect(409);
        expectConflictWithAgents(response);
      });

      it('returns 200 and deletes tools when force=true', async () => {
        const response = await supertest
          .post('/internal/agent_builder/tools/_bulk_delete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ ids: IDS.bulk.tools, force: true })
          .expect(200);
        expect(response.body).to.have.property('results');
        expect(response.body.results).to.have.length(IDS.bulk.tools.length);
        for (let i = 0; i < IDS.bulk.tools.length; i++) {
          expect(response.body.results[i]).to.have.property('toolId', IDS.bulk.tools[i]);
          expect(response.body.results[i]).to.have.property('success', true);
        }
        for (const id of IDS.bulk.tools) {
          await supertest.get(`/api/agent_builder/tools/${id}`).expect(404);
        }
      });
    });
  });
}
