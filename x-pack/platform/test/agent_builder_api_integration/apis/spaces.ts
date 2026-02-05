/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ListToolsResponse } from '@kbn/agent-builder-plugin/common/http_api/tools';
import type { ListAgentResponse } from '@kbn/agent-builder-plugin/common/http_api/agents';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { spaceUrl } from '../utils/spaces';
import { createTool, deleteTool } from '../utils/tools';
import { createAgent, deleteAgent } from '../utils/agents';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spaces = getService('spaces');
  const es = getService('es');

  describe('Space support', () => {
    const testTools: Array<{ toolId: string; spaceId: string }> = [
      { toolId: 'default-tool-1', spaceId: 'default' },
      { toolId: 'default-tool-2', spaceId: 'default' },
      { toolId: 'space1-tool-1', spaceId: 'space-1' },
      { toolId: 'space1-tool-2', spaceId: 'space-1' },
      { toolId: 'space2-tool-1', spaceId: 'space-2' },
    ];

    const testAgents: Array<{ agentId: string; spaceId: string }> = [
      { agentId: 'default-agent-1', spaceId: 'default' },
      { agentId: 'default-agent-2', spaceId: 'default' },
      { agentId: 'space1-agent-1', spaceId: 'space-1' },
      { agentId: 'space1-agent-2', spaceId: 'space-1' },
      { agentId: 'space2-agent-1', spaceId: 'space-2' },
    ];

    before(async () => {
      await spaces.create({
        id: 'space-1',
        name: 'space-1',
        disabledFeatures: [],
      });

      await spaces.create({
        id: 'space-2',
        name: 'space-2',
        disabledFeatures: [],
      });

      await es.indices.create({
        index: 'spaces-test-index',
        mappings: { dynamic: true },
      });

      for (const tool of testTools) {
        await createTool({ id: tool.toolId }, { space: tool.spaceId, supertest });
      }
      for (const agent of testAgents) {
        await createAgent({ id: agent.agentId }, { space: agent.spaceId, supertest });
      }
    });

    after(async () => {
      for (const tool of testTools) {
        await deleteTool(tool.toolId, { space: tool.spaceId, supertest });
      }
      for (const agent of testAgents) {
        await deleteAgent(agent.agentId, { space: agent.spaceId, supertest });
      }

      await es.indices.delete({ index: 'spaces-test-index' });

      await spaces.delete('space-1');
      await spaces.delete('space-2');
    });

    describe('Space support - Tool APIs', () => {
      for (const spaceId of ['default', 'space-1', 'space-2']) {
        it(`should list the correct tools in the "${spaceId}" space`, async () => {
          const response = await supertest
            .get(spaceUrl('/api/agent_builder/tools', spaceId))
            .set('kbn-xsrf', 'kibana')
            .expect(200);

          const res = response.body as ListToolsResponse;
          const tools = res.results.filter((tool) => !tool.readonly);

          const expectedTools = testTools
            .filter((tool) => tool.spaceId === spaceId)
            .map((tool) => tool.toolId)
            .sort();
          expect(tools.map((tool) => tool.id).sort()).to.eql(expectedTools);
        });
      }
    });

    describe('Space support - Agent APIs', () => {
      for (const spaceId of ['default', 'space-1', 'space-2']) {
        it(`should list the correct tools in the "${spaceId}" space`, async () => {
          const response = await supertest
            .get(spaceUrl('/api/agent_builder/agents', spaceId))
            .set('kbn-xsrf', 'kibana')
            .expect(200);

          const res = response.body as ListAgentResponse;
          const agents = res.results.filter((agent) => !agent.readonly);

          const expectedAgents = testAgents
            .filter((agent) => agent.spaceId === spaceId)
            .map((agent) => agent.agentId)
            .sort();
          expect(agents.map((agent) => agent.id).sort()).to.eql(expectedAgents);
        });
      }
    });
  });
}
