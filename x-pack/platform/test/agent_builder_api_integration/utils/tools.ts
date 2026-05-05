/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type supertest from 'supertest';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import { spaceUrl } from './spaces';

export const createTool = async (
  tool: { id: string } & Partial<Omit<ToolDefinition, 'id' | 'readonly'>>,
  { space = 'default', supertest }: { space?: string; supertest: supertest.Agent }
) => {
  const payload = {
    type: ToolType.index_search,
    description: 'A test tool',
    configuration: {
      pattern: '*',
    },
    ...tool,
  };

  return await supertest
    .post(spaceUrl('/api/agent_builder/tools', space))
    .set('kbn-xsrf', 'kibana')
    .send(payload)
    .expect(200);
};

export const deleteTool = async (
  toolId: string,
  { space = 'default', supertest }: { space?: string; supertest: supertest.Agent }
) => {
  await supertest
    .delete(spaceUrl(`/api/agent_builder/tools/${toolId}`, space))
    .set('kbn-xsrf', 'kibana')
    .expect(200);
};
