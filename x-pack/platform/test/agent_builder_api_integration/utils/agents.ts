/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type supertest from 'supertest';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { spaceUrl } from './spaces';

export const createAgent = async (
  tool: { id: string } & Partial<Omit<AgentDefinition, 'id' | 'readonly'>>,
  { space = 'default', supertest }: { space?: string; supertest: supertest.Agent }
) => {
  const payload = {
    name: 'Test Agent',
    description: 'A test agent',
    configuration: {
      instructions: 'Run this agent',
      tools: [{ tool_ids: [] }],
    },
    ...tool,
  };

  return await supertest
    .post(spaceUrl('/api/agent_builder/agents', space))
    .set('kbn-xsrf', 'kibana')
    .send(payload)
    .expect(200);
};

export const deleteAgent = async (
  agentId: string,
  { space = 'default', supertest }: { space?: string; supertest: supertest.Agent }
) => {
  await supertest
    .delete(spaceUrl(`/api/agent_builder/agents/${agentId}`, space))
    .set('kbn-xsrf', 'kibana')
    .expect(200);
};
