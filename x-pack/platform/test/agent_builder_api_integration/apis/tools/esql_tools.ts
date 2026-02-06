/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('ES|QL Tools API', () => {
    const createdToolIds: string[] = [];

    const mockTool = {
      id: 'cases-tool',
      type: 'esql',
      description: 'A test tool',
      tags: ['test'],
      configuration: {
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'string', description: 'Case ID' } },
      },
    };

    after(async () => {
      for (const toolId of createdToolIds) {
        try {
          await supertest
            .delete(`/api/agent_builder/tools/${toolId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(200);
        } catch (error) {
          log.warning(`Failed to delete tool ${toolId}: ${error.message}`);
        }
      }
    });

    describe('POST /api/agent_builder/tools', () => {
      it('should create a new ES|QL tool successfully', async () => {
        const response = await supertest
          .post('/api/agent_builder/tools')
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

      it('should create a tool with all supported parameter types', async () => {
        const toolWithAllParamTypes = {
          id: 'all-param-types-tool',
          type: 'esql',
          description: 'A tool with all parameter types',
          tags: ['test'],
          configuration: {
            query:
              'FROM my_cases | WHERE case_id == ?case_id AND priority >= ?priority AND score >= ?score AND is_active == ?is_active AND @timestamp >= ?since AND owner == ?owners',
            params: {
              case_id: { type: 'string', description: 'Case ID' },
              priority: { type: 'integer', description: 'Priority' },
              score: { type: 'float', description: 'Score' },
              is_active: { type: 'boolean', description: 'Is active' },
              since: { type: 'date', description: 'Since timestamp' },
              owners: { type: 'array', description: 'Owners list' },
            },
          },
        };

        const response = await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolWithAllParamTypes)
          .expect(200);

        expect(response.body).to.have.property('id', toolWithAllParamTypes.id);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration.params).to.eql(
          toolWithAllParamTypes.configuration.params
        );

        createdToolIds.push(toolWithAllParamTypes.id);
      });

      it('should validate tool ID format', async () => {
        const invalidTool = {
          ...mockTool,
          id: 'invalid tool id!',
        };

        const response = await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(invalidTool)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('Invalid tool id: "invalid tool id!"');
      });

      it('should require required fields', async () => {
        const incompleteTool = {
          id: 'incomplete-tool',
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(incompleteTool)
          .expect(400);
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
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolWithInvalidParams)
          .expect(400);
      });
    });

    describe('POST /api/agent_builder/tools/_execute', () => {
      const testIndex = 'test-agent-builder-index';

      before(async () => {
        await es.indices.create({
          index: testIndex,
          mappings: {
            properties: {
              name: { type: 'text' },
              age: { type: 'integer' },
              '@timestamp': { type: 'date' },
            },
          },
        });
        await es.bulk({
          body: [
            { index: { _index: testIndex } },
            { name: 'Test Case 1', age: 25, '@timestamp': '2023-01-01T00:00:00Z' },
            { index: { _index: testIndex } },
            { name: 'Test Case 2', age: 30, '@timestamp': '2023-01-02T00:00:00Z' },
            { index: { _index: testIndex } },
            { name: 'Test Case 3', age: 35, '@timestamp': '2023-01-03T00:00:00Z' },
          ],
        });
        await es.indices.refresh({ index: testIndex });

        const testTool = {
          type: 'esql',
          description: 'A test tool',
          tags: ['test'],
          configuration: {
            query: `FROM ${testIndex} | LIMIT 3`,
            params: {},
          },
          id: 'execute-test-tool',
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        createdToolIds.push(testTool.id);
      });

      it('should execute a new ES|QL tool successfully', async () => {
        const executeRequest = {
          tool_id: 'execute-test-tool',
          tool_params: {},
        };
        const response = await supertest
          .post('/api/agent_builder/tools/_execute')
          .set('kbn-xsrf', 'kibana')
          .send(executeRequest)
          .expect(200);

        expect(response.body).to.have.property('results');
      });

      after(async () => {
        await es.indices.delete({ index: testIndex });
      });
    });

    describe('GET /api/agent_builder/tools/get-test-tool', () => {
      let testToolId: string;

      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'get-test-tool',
        };

        const response = await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        testToolId = response.body.id;
        createdToolIds.push(testToolId);
      });

      it('should retrieve an existing ES|QL tool', async () => {
        const response = await supertest.get(`/api/agent_builder/tools/get-test-tool`).expect(200);

        expect(response.body).to.have.property('id', 'get-test-tool');
        expect(response.body).to.have.property('type', 'esql');
        expect(response.body).to.have.property('description', mockTool.description);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration).to.have.property('query', mockTool.configuration.query);
        expect(response.body.configuration.params).to.eql(mockTool.configuration.params);
      });

      it('should return 404 for non-existent tool', async () => {
        const response = await supertest
          .get('/api/agent_builder/tools/non-existent-tool')
          .expect(404);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('not found');
      });
    });

    describe('GET /api/agent_builder/tools', () => {
      before(async () => {
        for (let i = 0; i < 3; i++) {
          const testTool = {
            ...mockTool,
            id: `list-test-tool-${i}`,
          };

          await supertest
            .post('/api/agent_builder/tools')
            .set('kbn-xsrf', 'kibana')
            .send(testTool)
            .expect(200);

          createdToolIds.push(testTool.id);
        }
      });

      it('should list all ES|QL tools', async () => {
        const response = await supertest.get('/api/agent_builder/tools').expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results.length).to.greaterThan(1);
      });
    });

    describe('PUT /api/agent_builder/tools/update-test-tool', () => {
      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'update-test-tool',
        };

        await supertest
          .post('/api/agent_builder/tools')
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
          .put(`/api/agent_builder/tools/update-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .send(updates)
          .expect(200);

        expect(response.body).to.have.property('id', 'update-test-tool');
        expect(response.body).to.have.property('description', updates.description);
      });

      it('should return 404 for non-existent tool', async () => {
        await supertest
          .put('/api/agent_builder/tools/non-existent-tool')
          .set('kbn-xsrf', 'kibana')
          .send({ description: 'Updated description' })
          .expect(404);
      });
    });

    describe('DELETE /api/agent_builder/tools/delete-test-tool', () => {
      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'delete-test-tool',
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        createdToolIds.push(testTool.id);
      });

      it('should delete an existing ES|QL tool', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/tools/delete-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('success', true);
      });

      it('should return success even for non-existent tool', async () => {
        const response = await supertest
          .delete('/api/agent_builder/tools/non-existent-tool')
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        expect(response.body).to.have.property('message', 'Tool non-existent-tool not found');
      });
    });
  });
}
