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

  describe('Index Search Tools API', () => {
    const createdToolIds: string[] = [];
    const testIndex = 'test-search-agent-builder-index';

    const mockTool = {
      id: 'search-tool',
      type: 'index_search',
      description: 'A test search tool',
      tags: ['test', 'search'],
      configuration: {
        pattern: testIndex,
        row_limit: 100,
        custom_instructions: 'Search test data',
      },
    };

    before(async () => {
      // Create test index
      await es.indices.create({
        index: testIndex,
      });
    });

    after(async () => {
      // Clean up created tools
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

      // Clean up test index
      try {
        await es.indices.delete({ index: testIndex });
      } catch (error) {
        log.warning(`Failed to delete test index ${testIndex}: ${error.message}`);
      }
    });

    describe('POST /api/agent_builder/tools', () => {
      it('should create a new index search tool successfully', async () => {
        const response = await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(mockTool)
          .expect(200);

        expect(response.body).to.have.property('id', mockTool.id);
        expect(response.body).to.have.property('type', 'index_search');
        expect(response.body).to.have.property('description', mockTool.description);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration).to.have.property(
          'pattern',
          mockTool.configuration.pattern
        );
        expect(response.body.configuration).to.have.property(
          'row_limit',
          mockTool.configuration.row_limit
        );
        expect(response.body.configuration).to.have.property(
          'custom_instructions',
          mockTool.configuration.custom_instructions
        );

        createdToolIds.push(mockTool.id);
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

      it('should require pattern in configuration', async () => {
        const toolWithoutPattern = {
          ...mockTool,
          id: 'no-pattern-tool',
          configuration: {
            row_limit: 100,
          },
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolWithoutPattern)
          .expect(400);
      });

      it('should validate index pattern exists', async () => {
        const toolWithInvalidPattern = {
          ...mockTool,
          id: 'invalid-pattern-tool',
          configuration: {
            ...mockTool.configuration,
            pattern: 'non-existent-index-pattern-that-definitely-does-not-exist-12345',
          },
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolWithInvalidPattern)
          .expect(400);
      });

      it('should fail if row limit is not a number', async () => {
        const toolWithInvalidRowLimit = {
          ...mockTool,
          id: 'invalid-row-limit-tool',
          configuration: {
            ...mockTool.configuration,
            row_limit: 'not a number',
          },
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolWithInvalidRowLimit)
          .expect(400);
      });

      it('should fail if row limit is less than 1', async () => {
        const toolWithInvalidRowLimit = {
          ...mockTool,
          id: 'invalid-row-limit-tool',
          configuration: {
            ...mockTool.configuration,
            row_limit: -1,
          },
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(toolWithInvalidRowLimit)
          .expect(400);
      });
    });

    describe('GET /api/agent_builder/tools/get-search-test-tool', () => {
      let testToolId: string;

      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'get-search-test-tool',
        };

        const response = await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        testToolId = response.body.id;
        createdToolIds.push(testToolId);
      });

      it('should retrieve an existing index search tool', async () => {
        const response = await supertest
          .get(`/api/agent_builder/tools/get-search-test-tool`)
          .expect(200);

        expect(response.body).to.have.property('id', 'get-search-test-tool');
        expect(response.body).to.have.property('type', 'index_search');
        expect(response.body).to.have.property('description', mockTool.description);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration).to.have.property(
          'pattern',
          mockTool.configuration.pattern
        );
        expect(response.body.configuration).to.have.property(
          'row_limit',
          mockTool.configuration.row_limit
        );
      });

      it('should return 404 for non-existent tool', async () => {
        const response = await supertest
          .get('/api/agent_builder/tools/non-existent-search-tool')
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
            id: `list-search-test-tool-${i}`,
            configuration: {
              pattern: testIndex,
              row_limit: 50,
            },
          };

          await supertest
            .post('/api/agent_builder/tools')
            .set('kbn-xsrf', 'kibana')
            .send(testTool)
            .expect(200);

          createdToolIds.push(testTool.id);
        }
      });

      it('should list all index search tools', async () => {
        const response = await supertest.get('/api/agent_builder/tools').expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results.length).to.greaterThan(1);

        // Verify at least some are index_search type
        const indexSearchTools = response.body.results.filter(
          (tool: any) => tool.type === 'index_search'
        );
        expect(indexSearchTools.length).to.greaterThan(0);
      });
    });

    describe('PUT /api/agent_builder/tools/update-search-test-tool', () => {
      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'update-search-test-tool',
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);

        createdToolIds.push(testTool.id);
      });

      it('should update an existing index search tool description', async () => {
        const updates = {
          description: 'Updated search description',
        };

        const response = await supertest
          .put(`/api/agent_builder/tools/update-search-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .send(updates)
          .expect(200);

        expect(response.body).to.have.property('id', 'update-search-test-tool');
        expect(response.body).to.have.property('description', updates.description);
      });

      it('should update index search tool configuration', async () => {
        const updates = {
          configuration: {
            pattern: testIndex,
            row_limit: 200,
            custom_instructions: 'Updated custom instructions',
          },
        };

        const response = await supertest
          .put(`/api/agent_builder/tools/update-search-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .send(updates)
          .expect(200);

        expect(response.body).to.have.property('id', 'update-search-test-tool');
        expect(response.body.configuration).to.have.property(
          'pattern',
          updates.configuration.pattern
        );
        expect(response.body.configuration).to.have.property(
          'row_limit',
          updates.configuration.row_limit
        );
        expect(response.body.configuration).to.have.property(
          'custom_instructions',
          updates.configuration.custom_instructions
        );
      });

      it('should return 404 for non-existent tool', async () => {
        await supertest
          .put('/api/agent_builder/tools/non-existent-search-tool')
          .set('kbn-xsrf', 'kibana')
          .send({ description: 'Updated description' })
          .expect(404);
      });
    });

    describe('DELETE /api/agent_builder/tools/delete-search-test-tool', () => {
      before(async () => {
        const testTool = {
          ...mockTool,
          id: 'delete-search-test-tool',
        };

        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'kibana')
          .send(testTool)
          .expect(200);
      });

      it('should delete an existing index search tool', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/tools/delete-search-test-tool`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('success', true);
      });

      it('should return 404 for non-existent tool', async () => {
        const response = await supertest
          .delete('/api/agent_builder/tools/non-existent-search-tool')
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        expect(response.body).to.have.property(
          'message',
          'Tool non-existent-search-tool not found'
        );
      });
    });
  });
}
