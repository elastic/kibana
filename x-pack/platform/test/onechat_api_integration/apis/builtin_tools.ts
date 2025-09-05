/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { platformCoreTools } from '@kbn/onechat-common';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const searchTool = platformCoreTools.search;

  describe('Builtin Tools API', () => {
    describe(`DELETE /api/chat/tools/{toolName}`, () => {
      it('should return 400 error when attempting to delete any read-only builtin system tool', async () => {
        for (const toolId of Object.values(platformCoreTools) as string[]) {
          const response = await supertest
            .delete(`/api/chat/tools/${toolId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(400);

          expect(response.body).to.have.property('message');
          expect(response.body.message).to.eql(`Tool ${toolId} is read-only and can't be deleted`);
        }
      });

      it('should return 404 when builtin tools API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': false,
        });

        await supertest
          .delete(`/api/chat/tools/${searchTool}`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': true,
        });
      });
    });

    describe(`PUT /api/chat/tools/${searchTool}`, () => {
      it('should return 400 when attempting to update a builtin system tool', async () => {
        await supertest
          .put(`/api/chat/tools/${searchTool}`)
          .set('kbn-xsrf', 'kibana')
          .send({ description: 'Updated description' })
          .expect(400);
      });
    });

    describe('POST /api/chat/tools', () => {
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
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolData)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain(
          `Invalid tool id: "${searchTool}": Tool id is using a protected namespaces`
        );
      });
    });

    describe('POST /api/chat/tools/_execute', () => {
      it('should execute a builtin tool successfully', async () => {
        const executeRequest = {
          tool_id: platformCoreTools.listIndices,
          tool_params: {},
        };

        const response = await supertest
          .post('/api/chat/tools/_execute')
          .set('kbn-xsrf', 'kibana')
          .send(executeRequest)
          .expect(200);

        expect(response.body).to.have.property('results');
      });

      it('should return 404 when tools API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': false,
        });

        const executeRequest = {
          tool_id: searchTool,
          tool_params: {
            query: 'test query',
          },
        };

        await supertest
          .post('/api/chat/tools/_execute')
          .set('kbn-xsrf', 'kibana')
          .send(executeRequest)
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': true,
        });
      });
    });
  });
}
