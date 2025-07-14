/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');

  describe('ES|QL Tools API', () => {
    let createdToolIds: string[] = [];

    const mockTool = {
      id: 'cases-tool',
      name: 'existing-tool',
      type: 'esql',
      description: 'A test tool',
      tags: ["test"],
      configuration: { 
        query: 'FROM my_cases | WHERE case_id == ?case_id', 
        params: { case_id: { type: 'keyword', description: 'Case ID' } } 
      } ,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    before(async () => {
      await kibanaServer.uiSettings.update({
        'onechat:api:enabled': true,
      });
    });

    after(async () => {
      for (const toolId of createdToolIds) {
        try {
          await supertest
            .delete(`/api/chat/tools/${toolId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(200);
        } catch (error) {
          log.warning(`Failed to delete tool ${toolId}: ${error.message}`);
        }
      }

      await kibanaServer.uiSettings.update({
        'onechat:api:enabled': false,
      });
    });

    describe('POST /api/chat/tools', () => {
      it('should create a new ES|QL tool successfully', async () => {
        const response = await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(mockTool)
          .expect(200);

        expect(response.body).to.have.property('id', mockTool.id);
        expect(response.body).to.have.property('type', 'esql');
        expect(response.body).to.have.property('name', mockTool.name);
        expect(response.body).to.have.property('description', mockTool.description);
        expect(response.body.tags).to.eql(mockTool.tags);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration).to.have.property('query', mockTool.configuration.query);
        expect(response.body.configuration).to.have.property('params', mockTool.configuration.params);
        expect(response.body).to.have.property('created_at');
        expect(response.body).to.have.property('updated_at');

        createdToolIds.push(mockTool.id);
      });

      it('should validate tool ID format', async () => {
        const invalidTool = {
          ...mockTool,
          id: 'invalid tool id!',
        };

        const response = await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(invalidTool)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('letters, numbers, underscores, and hyphens');
      });

      it('should require required fields', async () => {
        const incompleteTool = {
          id: 'incomplete-tool',
        };

        await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(incompleteTool)
          .expect(400);
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': false,
        });

        await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(mockTool)
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': true,
        });
      });

      it('should return 400 if invalid ES|QL syntax', async () => {
        const invalidTool = {
          ...mockTool,
          configuration: {
            query: 'LIMIT 1',
            params: {}
          }
        };

        const response = await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(invalidTool)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('Validation error');
        
      });

      it('should return 400 if parameter in list is mising from query', async () => {
        const invalidTool = {
          ...mockTool,
          configuration: {
            query: 'FROM my_cases | WHERE case_id == ?case_id',
            params: {}
          }
        };

        const response = await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(invalidTool)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('Validation error');
      });

      it('should return 400 if invalid ES|QL syntax', async () => {
        const invalidTool = {
          ...mockTool,
          configuration: {
            query: 'FROM my_cases',
            params: {
              case_id: { type: 'keyword', description: 'Case ID' },
            }
          }
        };

        const response = await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(invalidTool)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('Validation error');
        
      });
    });

    describe('GET /api/chat/tools/{id}', () => {
      let testToolId: string;

      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'get-test-tool',
        };

        const response = await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        testToolId = response.body.tool.id;
        createdToolIds.push(testToolId);
      });

      it('should retrieve an existing ES|QL tool', async () => {
        const response = await supertest
          .get(`/api/chat/tools/${testToolId}`)
          .expect(200);

        expect(response.body).to.have.property('id');
        expect(response.body).to.have.property('type');
        expect(response.body.tool).to.have.property('description');
        expect(response.body).to.have.property('tags');
        expect(response.body.tool).to.have.property('configuration');
      });

      it('should return 404 for non-existent tool', async () => {
        const response = await supertest
          .get('/api/chat/tools/non-existent-tool')
          .expect(404);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('not found');
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': false,
        });

        await supertest
          .get(`/api/chat/tools/${testToolId}`)
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': true,
        });
      });
    });

    describe('GET /api/chat/tools', () => {
      let testToolIds: string[] = [];

      before(async () => {
        for (let i = 0; i < 3; i++) {
          const testTool = {
            ...mockTool,
            id: `list-test-tool-${i}`,
            name: `Test Tool ${i}`,
            meta: { tags: ['test', `tag${i}`] },
          };

          const response = await supertest
            .post('/api/chat/tools')
            .set('kbn-xsrf', 'kibana')
            .send(testTool)
            .expect(200);

          testToolIds.push(response.body.tool.id);
          createdToolIds.push(response.body.tool.id);
        }
      });

      it('should list all ES|QL tools', async () => {
        const response = await supertest
          .get('/api/chat/tools')
          .expect(200);

        expect(response.body.tools).to.be.an('array');
        expect(response.body.tools.length).to.be.greaterThan(0);

        const toolIds = response.body.tools.map((tool: any) => tool.id);
        testToolIds.forEach(toolId => {
          expect(toolIds).to.contain(toolId);
        });
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': false,
        });

        await supertest
          .get('/api/chat/tools/esql')
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': true,
        });
      });
    });

    describe('PUT /api/chat/tools/{id}', () => {
      let testToolId: string;

      beforeEach(async () => {
        const testTool = {
          ...mockTool,
          id: 'update-test-tool',
        };

        const response = await supertest
          .post('/api/chat/tools/esql')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        testToolId = response.body.tool.id;
        createdToolIds.push(testToolId);
      });

      it('should update an existing ES|QL tool', async () => {
        const updates = {
          name: 'Updated Tool Name',
          description: 'Updated description',
        };

        const response = await supertest
          .put(`/api/chat/tools/${testToolId}`)
          .set('kbn-xsrf', 'kibana')
          .send(updates)
          .expect(200);

        expect(response.body).to.have.property('esqlTool');
        expect(response.body.esqlTool).to.have.property('id', testToolId);
        expect(response.body.esqlTool).to.have.property('name', updates.name);
        expect(response.body.esqlTool).to.have.property('description', updates.description);
      });

      it('should return 404 for non-existent tool', async () => {
        await supertest
          .put('/api/chat/tools/non-existent-tool')
          .set('kbn-xsrf', 'kibana')
          .send({ name: 'Updated Name' })
          .expect(404);
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': false,
        });

        await supertest
          .put(`/api/chat/tools/${testToolId}`)
          .set('kbn-xsrf', 'kibana')
          .send({ name: 'Updated Name' })
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': true,
        });
      });
    });

    describe('DELETE /api/chat/tools/{id}', () => {
      let testToolId: string;

      beforeEach(async () => {
        const testTool = {
          ...mockTool,
          id: 'delete-test-tool',
        };

        const response = await supertest
          .post('/api/chat/tools/esql')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        testToolId = response.body.tool.id;
      });

      it('should delete an existing ES|QL tool', async () => {
        const response = await supertest
          .delete(`/api/chat/tools/${testToolId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('success', true);
      });

      it('should return success even for non-existent tool', async () => {
        const response = await supertest
          .delete('/api/chat/tools/non-existent-tool')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('message', 'not found');
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': false,
        });

        await supertest
          .delete(`/api/chat/tools/esql/${testToolId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled: true': true,
        });
      });
    });

    describe('Parameter Type validation', () => {
      it('should validate parameter types', async () => {
        const toolWithInvalidParams = {
          ...mockTool,
          id: 'invalid-params-tool',
          params: {
            validParam: {
              type: 'string',
              description: 'Valid parameter',
            },
            invalidParam: {
              type: 'invalid_type',
              description: 'Invalid parameter',
            },
          },
        };

        await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolWithInvalidParams)
          .expect(400);
      });
    });

    describe('End-to-end workflow', () => {
      it('should support complete CRUD operations', async () => {
        const toolId = 'e2e-test-tool';
        
        const createResponse = await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send({
            ...mockTool,
            id: toolId,
          })
          .expect(200);

        expect(createResponse.body.tool.id).to.equal(toolId);

        const getResponse = await supertest
          .get(`/api/chat/tools/${toolId}`)
          .expect(200);

        expect(getResponse.body.tool.id).to.equal(toolId);

        const updateResponse = await supertest
          .put(`/api/chat/tools/${toolId}`)
          .set('kbn-xsrf', 'kibana')
          .send({
            name: 'Updated E2E Tool',
            description: 'Updated for end-to-end testing',
          })
          .expect(200);

        expect(updateResponse.body.esqlTool.name).to.equal('Updated E2E Tool');

        const listResponse = await supertest
          .get('/api/chat/tools')
          .expect(200);

        const toolIds = listResponse.body.tools.map((tool: any) => tool.id);
        expect(toolIds).to.contain(toolId);

        await supertest
          .delete(`/api/chat/tools/${toolId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        await supertest
          .get(`/api/chat/tools/${toolId}`)
          .expect(404);
      });
    });
  });
}