/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Payload } from '@hapi/boom';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type {
  ListConversationsResponse,
  DeleteConversationResponse,
} from '@kbn/agent-builder-plugin/common/http_api/conversations';
import { createLlmProxy, type LlmProxy } from '../utils/llm_proxy';
import { setupAgentDirectAnswer } from '../utils/proxy_scenario';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/llm_proxy_action_connector';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import type { AgentBuilderApiFtrProviderContext } from '../../agent_builder/services/api';

export default function ({ getService }: AgentBuilderApiFtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const agentBuilderApiClient = createAgentBuilderApiClient(supertest);

  describe('Conversation API', () => {
    let llmProxy: LlmProxy;
    let connectorId: string;
    const createdConversationIds: string[] = [];

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
    });

    after(async () => {
      for (const conversationId of createdConversationIds) {
        try {
          await supertest
            .delete(`/api/agent_builder/conversations/${conversationId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(200);
        } catch (error) {
          log.warning(`Failed to delete conversation ${conversationId}: ${error.message}`);
        }
      }

      llmProxy.close();
      await deleteActionConnector(getService, { actionId: connectorId });
    });

    async function createConversation(input: string, title: string): Promise<string> {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title,
        response: `Response to: ${input}`,
      });

      const response = await agentBuilderApiClient.converse({
        input,
        connector_id: connectorId,
      });

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      createdConversationIds.push(response.conversation_id);
      return response.conversation_id;
    }

    function removeTrackedConversationIdFromCleanup(conversationId: string): void {
      const index = createdConversationIds.indexOf(conversationId);
      if (index > -1) {
        createdConversationIds.splice(index, 1);
      }
    }

    describe('GET /api/agent_builder/conversations', () => {
      const testConversationIds: string[] = [];

      before(async () => {
        // Create multiple test conversations
        for (let i = 0; i < 3; i++) {
          const conversationId = await createConversation(
            `Test message ${i}`,
            `Test Conversation ${i}`
          );
          testConversationIds.push(conversationId);
        }
      });

      it('should list all conversations', async () => {
        const response = await supertest
          .get('/api/agent_builder/conversations')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results.length).to.be.greaterThan(0);

        // Verify the structure of conversation objects
        const conversation = response.body.results[0];
        expect(conversation).to.have.property('id');
        expect(conversation).to.have.property('title');
        expect(conversation).to.have.property('agent_id');
        expect(conversation).to.have.property('user');
        expect(conversation).to.have.property('created_at');
        expect(conversation).to.have.property('updated_at');

        // Should not include rounds when listing conversations
        expect(conversation).to.not.have.property('rounds');
      });

      it('should verify created conversations are in the list', async () => {
        const response = await supertest
          .get('/api/agent_builder/conversations')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const body: ListConversationsResponse = response.body;
        const conversationIds = body.results.map((c) => c.id);

        for (const testId of testConversationIds) {
          expect(conversationIds).to.contain(testId);
        }
      });

      it('should filter conversations by agent_id', async () => {
        const conversationId = await createConversation('Agent filter test', 'Agent Filter Test');
        const conversation = await agentBuilderApiClient.getConversation(conversationId);
        const agentId = conversation.agent_id;

        const response = await supertest
          .get('/api/agent_builder/conversations')
          .query({ agent_id: agentId })
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const body: ListConversationsResponse = response.body;
        expect(body.results).to.be.an('array');

        for (const conv of body.results) {
          expect(conv.agent_id).to.equal(agentId);
        }
      });

      it('should return empty array when filtering by non-existent agent_id', async () => {
        const response = await supertest
          .get('/api/agent_builder/conversations')
          .query({ agent_id: 'non-existent-agent-id' })
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const body: ListConversationsResponse = response.body;
        expect(body.results).to.be.an('array');
        expect(body.results).to.have.length(0);
      });
    });

    describe('GET /api/agent_builder/conversations/{conversation_id}', () => {
      let testConversationId: string;
      const testInput = 'Test message for get endpoint';
      const testTitle = 'Get Test Conversation';

      before(async () => {
        testConversationId = await createConversation(testInput, testTitle);
      });

      it('should retrieve an existing conversation by ID', async () => {
        const response = await supertest
          .get(`/api/agent_builder/conversations/${testConversationId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const conversation: Conversation = response.body;

        expect(conversation).to.have.property('id', testConversationId);
        expect(conversation).to.have.property('title', testTitle);
        expect(conversation).to.have.property('agent_id');
        expect(conversation).to.have.property('user');
        // User object should have either 'id' or 'username' depending if serverless or ECH
        expect(conversation.user).to.be.an('object');
        expect(conversation).to.have.property('created_at');
        expect(conversation).to.have.property('updated_at');
        expect(conversation).to.have.property('rounds');
        expect(conversation.rounds).to.be.an('array');
        expect(conversation.rounds.length).to.be.greaterThan(0);
      });

      it('should include conversation rounds with messages', async () => {
        const response = await supertest
          .get(`/api/agent_builder/conversations/${testConversationId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const conversation: Conversation = response.body;
        const firstRound = conversation.rounds[0];

        expect(firstRound).to.have.property('input');
        expect(firstRound).to.have.property('response');
        expect(firstRound).to.have.property('steps');
        expect(firstRound.input).to.have.property('message');
        expect(firstRound.response).to.have.property('message');
        expect(firstRound.steps).to.be.an('array');
      });

      it('should return 404 for non-existent conversation', async () => {
        const nonExistentId = 'non-existent-conversation-id-12345';
        const response = await supertest
          .get(`/api/agent_builder/conversations/${nonExistentId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        const body: Payload = response.body;
        expect(body).to.have.property('message');
        expect(body.message).to.contain('not found');
      });
    });

    describe('DELETE /api/agent_builder/conversations/{conversation_id}', () => {
      let conversationToDelete: string;

      beforeEach(async () => {
        conversationToDelete = await createConversation(
          'Message for delete test',
          'Delete Test Conversation'
        );
      });

      it('should delete an existing conversation', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/conversations/${conversationToDelete}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const body: DeleteConversationResponse = response.body;
        expect(body).to.have.property('success', true);

        await supertest
          .get(`/api/agent_builder/conversations/${conversationToDelete}`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        removeTrackedConversationIdFromCleanup(conversationToDelete);
      });

      it('should return 404 when deleting non-existent conversation', async () => {
        const nonExistentId = 'non-existent-conversation-to-delete';
        const response = await supertest
          .delete(`/api/agent_builder/conversations/${nonExistentId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        const body: Payload = response.body;
        expect(body).to.have.property('message');
        expect(body.message).to.contain('not found');
      });

      it('should not allow deleting the same conversation twice', async () => {
        await supertest
          .delete(`/api/agent_builder/conversations/${conversationToDelete}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        // Second deletion should fail with 404
        const response = await supertest
          .delete(`/api/agent_builder/conversations/${conversationToDelete}`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        const body: Payload = response.body;
        expect(body).to.have.property('message');
        expect(body.message).to.contain('not found');

        removeTrackedConversationIdFromCleanup(conversationToDelete);
      });
    });

    describe('Conversation lifecycle integration', () => {
      it('should support full conversation lifecycle: create, list, get, delete', async () => {
        const testTitle = 'Lifecycle Test Conversation';

        // 1. Create a conversation
        const conversationId = await createConversation('Lifecycle test message', testTitle);

        // 2. Verify it appears in the list
        let listResponse = await supertest
          .get('/api/agent_builder/conversations')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        let conversationIds = listResponse.body.results.map((c: ConversationWithoutRounds) => c.id);
        expect(conversationIds).to.contain(conversationId);

        // 3. Get the full conversation
        const getResponse = await supertest
          .get(`/api/agent_builder/conversations/${conversationId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(getResponse.body.id).to.equal(conversationId);
        expect(getResponse.body.title).to.equal(testTitle);

        // 4. Delete the conversation
        await supertest
          .delete(`/api/agent_builder/conversations/${conversationId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        // 5. Verify it no longer appears in the list
        listResponse = await supertest
          .get('/api/agent_builder/conversations')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        conversationIds = listResponse.body.results.map((c: ConversationWithoutRounds) => c.id);
        expect(conversationIds).to.not.contain(conversationId);

        // 6. Verify GET returns 404
        await supertest
          .get(`/api/agent_builder/conversations/${conversationId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(404);

        removeTrackedConversationIdFromCleanup(conversationId);
      });
    });
  });
}
