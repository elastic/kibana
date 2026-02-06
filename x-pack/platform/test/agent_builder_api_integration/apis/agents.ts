/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('Agent API', () => {
    const createdAgentIds: string[] = [];

    const mockAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent for API testing',
      configuration: {
        instructions: 'You are a helpful test agent',
        tools: [
          {
            tool_ids: ['*'],
          },
        ],
      },
    };

    after(async () => {
      for (const agentId of createdAgentIds) {
        try {
          await supertest
            .delete(`/api/agent_builder/agents/${agentId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(200);
        } catch (error) {
          log.warning(`Failed to delete agent ${agentId}: ${error.message}`);
        }
      }
    });

    describe('POST /api/agent_builder/agents', () => {
      it('should create a new agent successfully', async () => {
        const response = await supertest
          .post('/api/agent_builder/agents')
          .set('kbn-xsrf', 'kibana')
          .send(mockAgent)
          .expect(200);

        expect(response.body).to.have.property('id', mockAgent.id);
        expect(response.body).to.have.property('name', mockAgent.name);
        expect(response.body).to.have.property('description', mockAgent.description);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration).to.have.property(
          'instructions',
          mockAgent.configuration.instructions
        );
        expect(response.body.configuration.tools).to.eql(mockAgent.configuration.tools);

        createdAgentIds.push(mockAgent.id);
      });

      it('should validate agent ID format', async () => {
        const invalidAgent = {
          ...mockAgent,
          id: 'invalid agent id!',
        };

        const response = await supertest
          .post('/api/agent_builder/agents')
          .set('kbn-xsrf', 'kibana')
          .send(invalidAgent)
          .expect(400);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('Invalid agent id');
      });

      it('should require required fields', async () => {
        const incompleteAgent = {
          id: 'incomplete-agent',
        };

        await supertest
          .post('/api/agent_builder/agents')
          .set('kbn-xsrf', 'kibana')
          .send(incompleteAgent)
          .expect(400);
      });

      it('should validate tool configuration', async () => {
        const agentWithInvalidTools = {
          ...mockAgent,
          id: 'invalid-tools-agent',
          configuration: {
            instructions: 'Test agent with invalid tools',
            tools: [
              {
                tool_ids: ['non-existent-tool'],
              },
            ],
          },
        };

        await supertest
          .post('/api/agent_builder/agents')
          .set('kbn-xsrf', 'kibana')
          .send(agentWithInvalidTools)
          .expect(400);
      });
    });

    describe('GET /api/agent_builder/agents/get-test-agent', () => {
      let testAgentId: string;

      before(async () => {
        const testAgent = {
          ...mockAgent,
          id: 'get-test-agent',
        };

        const response = await supertest
          .post('/api/agent_builder/agents')
          .set('kbn-xsrf', 'kibana')
          .send(testAgent)
          .expect(200);

        testAgentId = response.body.id;
        createdAgentIds.push(testAgentId);
      });

      it('should retrieve an existing agent', async () => {
        const response = await supertest
          .get(`/api/agent_builder/agents/get-test-agent`)
          .expect(200);

        expect(response.body).to.have.property('id', 'get-test-agent');
        expect(response.body).to.have.property('name', mockAgent.name);
        expect(response.body).to.have.property('description', mockAgent.description);
        expect(response.body).to.have.property('configuration');
        expect(response.body.configuration).to.have.property(
          'instructions',
          mockAgent.configuration.instructions
        );
        expect(response.body.configuration.tools).to.eql(mockAgent.configuration.tools);
      });

      it('should return 404 for non-existent agent', async () => {
        const response = await supertest
          .get('/api/agent_builder/agents/non-existent-agent')
          .expect(404);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('not found');
      });
    });

    describe('GET /api/agent_builder/agents', () => {
      const testAgentIds: string[] = [];

      before(async () => {
        for (let i = 0; i < 3; i++) {
          const testAgent = {
            ...mockAgent,
            id: `list-test-agent-${i}`,
            name: `List Test Agent ${i}`,
          };

          await supertest
            .post('/api/agent_builder/agents')
            .set('kbn-xsrf', 'kibana')
            .send(testAgent)
            .expect(200);

          testAgentIds.push(testAgent.id);
          createdAgentIds.push(testAgent.id);
        }
      });

      it('should list all agents', async () => {
        const response = await supertest.get('/api/agent_builder/agents').expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results.length).to.greaterThan(1);
      });
    });

    describe('PUT /api/agent_builder/agents/update-test-agent', () => {
      before(async () => {
        const testAgent = {
          ...mockAgent,
          id: 'update-test-agent',
        };

        await supertest
          .post('/api/agent_builder/agents')
          .set('kbn-xsrf', 'kibana')
          .send(testAgent)
          .expect(200);

        createdAgentIds.push(testAgent.id);
      });

      it('should update an existing agent', async () => {
        const updates = {
          name: 'Updated Test Agent',
          description: 'Updated description',
        };

        const response = await supertest
          .put(`/api/agent_builder/agents/update-test-agent`)
          .set('kbn-xsrf', 'kibana')
          .send(updates)
          .expect(200);

        expect(response.body).to.have.property('id', 'update-test-agent');
        expect(response.body).to.have.property('name', updates.name);
        expect(response.body).to.have.property('description', updates.description);
      });

      it('should update agent configuration', async () => {
        const configUpdates = {
          configuration: {
            instructions: 'Updated instructions for the agent',
            tools: [],
          },
        };

        const response = await supertest
          .put(`/api/agent_builder/agents/update-test-agent`)
          .set('kbn-xsrf', 'kibana')
          .send(configUpdates)
          .expect(200);

        expect(response.body).to.have.property('id', 'update-test-agent');
        expect(response.body.configuration).to.have.property(
          'instructions',
          configUpdates.configuration.instructions
        );
        expect(response.body.configuration.tools).to.eql(configUpdates.configuration.tools);
      });

      it('should return 404 for non-existent agent', async () => {
        await supertest
          .put('/api/agent_builder/agents/non-existent-agent')
          .set('kbn-xsrf', 'kibana')
          .send({ name: 'Updated name' })
          .expect(404);
      });
    });

    describe('DELETE /api/agent_builder/agents/delete-test-agent', () => {
      before(async () => {
        const testAgent = {
          ...mockAgent,
          id: 'delete-test-agent',
        };

        await supertest
          .post('/api/agent_builder/agents')
          .set('kbn-xsrf', 'kibana')
          .send(testAgent)
          .expect(200);

        createdAgentIds.push(testAgent.id);
      });

      it('should delete an existing agent', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/agents/delete-test-agent`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('success', true);
      });

      it('should return 404 for non-existent agent', async () => {
        const response = await supertest
          .delete('/api/agent_builder/agents/non-existent-agent')
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('not found');
      });
    });
  });
}
