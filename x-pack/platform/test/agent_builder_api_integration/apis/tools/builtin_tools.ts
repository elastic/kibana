/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const searchTool = platformCoreTools.search;

  describe('Builtin Tools API', () => {
    describe(`DELETE /api/agent_builder/tools/{toolName}`, () => {
      it('should return 400 error when attempting to delete any read-only builtin system tool', async () => {
        const toolId = platformCoreTools.generateEsql;
        const response = await supertest
          .delete(`/api/agent_builder/tools/${toolId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql(`Tool ${toolId} is read-only and can't be deleted`);
      });
    });

    describe(`PUT /api/agent_builder/tools/${searchTool}`, () => {
      it('should return 400 when attempting to update a builtin system tool', async () => {
        await supertest
          .put(`/api/agent_builder/tools/${searchTool}`)
          .set('kbn-xsrf', 'kibana')
          .send({ description: 'Updated description' })
          .expect(400);
      });
    });

    describe('POST /api/agent_builder/tools', () => {
      it('should return 400 when attempting to create a tool under an existing builtin tool ID', async () => {
        const toolData = {
          id: searchTool,
          type: 'esql',
          description: 'Attempting to create tool with builtin ID',
          configuration: {
            query: 'FROM test | LIMIT 10',
            params: {},
          },
        };

        const response = await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolData)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain(
          `Invalid tool id: "${searchTool}": Tool id is using a protected namespace.`
        );
      });
    });

    describe('POST /api/agent_builder/tools/_execute', () => {
      it('should execute a builtin tool successfully', async () => {
        const executeRequest = {
          tool_id: platformCoreTools.listIndices,
          tool_params: {},
        };

        const response = await supertest
          .post('/api/agent_builder/tools/_execute')
          .set('kbn-xsrf', 'kibana')
          .send(executeRequest)
          .expect(200);

        expect(response.body).to.have.property('results');
      });
    });
  });
}
