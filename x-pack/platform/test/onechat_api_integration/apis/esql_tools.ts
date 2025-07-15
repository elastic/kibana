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
      type: 'esql',
      description: 'A test tool',
      tags: ["test"],
      configuration: { 
        query: 'FROM my_cases | WHERE case_id == ?case_id', 
        params: { case_id: { type: 'keyword', description: 'Case ID' } } 
      } 
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
        expect(response.body).to.have.property('description', mockTool.description);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration).to.have.property('query', mockTool.configuration.query);
        expect(response.body.configuration.params).to.eql(mockTool.configuration.params);

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
        expect(response.body.message).to.eql('Invalid tool id: invalid tool id!: Tool ids must start and end with a letter or number, and can only contain lowercase letters, numbers, and underscores');
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
          'onechat:api:enabled': false,
        });

        await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(mockTool)
          .expect(404);

          await kibanaServer.uiSettings.update({
            'onechat:api:enabled': true,
          });
       });

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

    describe('GET /api/chat/tools/get-test-tool', () => {
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

        testToolId = response.body.id;
        createdToolIds.push(testToolId);
      });

      it('should retrieve an existing ES|QL tool', async () => {
        const response = await supertest
          .get(`/api/chat/tools/${testToolId}`)
          .expect(200);

          expect(response.body).to.have.property('id', 'get-test-tool');
          expect(response.body).to.have.property('type', 'esql');
          expect(response.body).to.have.property('description', mockTool.description);
          expect(response.body).to.have.property('configuration');
          expect(response.body.configuration).to.have.property('query', mockTool.configuration.query);
          expect(response.body.configuration.params).to.eql(mockTool.configuration.params);
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
          'onechat:api:enabled': false,
        });

        await supertest
          .get(`/api/chat/tools/get-test-tool`)
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': true,
        });
      });
    });

    describe('GET /api/chat/tools', () => {
      const testToolIds: string[] = [];

      before(async () => {
        for (let i = 0; i < 3; i++) {
          const testTool = {
            ...mockTool,
            id: `list-test-tool-${i}`,
          };

          await supertest
            .post('/api/chat/tools')
            .set('kbn-xsrf', 'kibana')
            .send(testTool)
            .expect(200);

          testToolIds.push(testTool.id);
          createdToolIds.push(testTool.id);
        }
      });

      it('should list all ES|QL tools', async () => {
        const response = await supertest
          .get('/api/chat/tools')
          .expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results.length).to.greaterThan(1);
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': false,
        });

        await supertest
          .get('/api/chat/tools/esql')
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': true,
        });
      });
    });

    describe('PUT /api/chat/tools/update-test-tool', () => {
      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'update-test-tool',
        }

        await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        createdToolIds.push(testTool.id);
      });

      it('should update an existing ES|QL tool', async () => {
        const updates = {
          description: 'Updated description',
        };

        const response = await supertest
          .put(`/api/chat/tools/update-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .send(updates)
          .expect(200);

        expect(response.body).to.have.property('id', 'update-test-tool');
        expect(response.body).to.have.property('description', updates.description);
      });

      it('should return 404 for non-existent tool', async () => {
        await supertest
          .put('/api/chat/tools/non-existent-tool')
          .set('kbn-xsrf', 'kibana')
          .send({ description: 'Updated description' })
          .expect(404);
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': false,
        });

        await supertest
          .put(`/api/chat/tools/update-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .send({ description: 'Updated Description' })
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': true,
        });
      });
    });

    describe('DELETE /api/chat/tools/delete-test-tool', () => {
      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'delete-test-tool',
        };

        await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        createdToolIds.push(testTool.id);
      });

      it('should delete an existing ES|QL tool', async () => {
        const response = await supertest
          .delete(`/api/chat/tools/delete-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('success', true);
      });

      it('should return success even for non-existent tool', async () => {
        const response = await supertest
          .delete('/api/chat/tools/non-existent-tool')
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        expect(response.body).to.have.property('message', 'Tool non-existent-tool not found');
      });

      it('should return 404 when ES|QL tool API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': false,
        });

        await supertest
          .delete(`/api/chat/tools/delete-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': true,
        });
      });
    }); 
  });
}