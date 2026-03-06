/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Payload } from '@hapi/boom';
import type { VersionedAttachment, UpdateOriginResponse } from '@kbn/agent-builder-common';
import type {
  CreateAttachmentResponse,
  ListAttachmentsResponse,
} from '@kbn/agent-builder-plugin/common/http_api/attachments';
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

  describe('Attachment API', () => {
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

    afterEach(() => {
      llmProxy?.clear();
    });

    async function createConversation(): Promise<string> {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: 'Test Conversation',
        response: 'Test response',
      });

      const response = await agentBuilderApiClient.converse({
        input: 'Hello',
        connector_id: connectorId,
      });

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      createdConversationIds.push(response.conversation_id);
      return response.conversation_id;
    }

    async function createTextAttachment(conversationId: string): Promise<VersionedAttachment> {
      const response = await supertest
        .post(`/api/agent_builder/conversations/${conversationId}/attachments`)
        .set('kbn-xsrf', 'kibana')
        .send({
          type: 'text',
          data: { content: 'test content' },
        })
        .expect(200);

      const body: CreateAttachmentResponse = response.body;
      return body.attachment;
    }

    describe('PUT /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}/origin', () => {
      it('should update origin for an existing attachment', async () => {
        const conversationId = await createConversation();
        const attachment = await createTextAttachment(conversationId);

        const response = await supertest
          .put(
            `/api/agent_builder/conversations/${conversationId}/attachments/${attachment.id}/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'saved-object-123' } })
          .expect(200);

        const body: UpdateOriginResponse = response.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('attachment');
        expect(body.attachment.id).to.equal(attachment.id);
        expect(body.attachment.origin).to.eql({ saved_object_id: 'saved-object-123' });
      });

      it('should persist the updated origin', async () => {
        const conversationId = await createConversation();
        const attachment = await createTextAttachment(conversationId);

        await supertest
          .put(
            `/api/agent_builder/conversations/${conversationId}/attachments/${attachment.id}/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'persisted-saved-object-456' } })
          .expect(200);

        const listResponse = await supertest
          .get(`/api/agent_builder/conversations/${conversationId}/attachments`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const listBody: ListAttachmentsResponse = listResponse.body;
        const updatedAttachment = listBody.results.find((a) => a.id === attachment.id);

        expect(updatedAttachment).to.be.ok();
        expect(updatedAttachment!.origin).to.eql({ saved_object_id: 'persisted-saved-object-456' });
      });

      it('should return 404 for non-existent conversation', async () => {
        const response = await supertest
          .put(
            `/api/agent_builder/conversations/non-existent-conversation/attachments/some-attachment/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'saved-object-123' } })
          .expect(404);

        const body: Payload = response.body;
        expect(body).to.have.property('message');
        expect(body.message).to.contain('not found');
      });

      it('should return 404 for non-existent attachment', async () => {
        const conversationId = await createConversation();

        const response = await supertest
          .put(
            `/api/agent_builder/conversations/${conversationId}/attachments/non-existent-attachment/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'saved-object-123' } })
          .expect(404);

        const body: Payload = response.body;
        expect(body).to.have.property('message');
        expect(body.message).to.contain('not found');
      });

      it('should return 400 for deleted attachment', async () => {
        const conversationId = await createConversation();
        const attachment = await createTextAttachment(conversationId);

        await supertest
          .delete(`/api/agent_builder/conversations/${conversationId}/attachments/${attachment.id}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const response = await supertest
          .put(
            `/api/agent_builder/conversations/${conversationId}/attachments/${attachment.id}/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'saved-object-123' } })
          .expect(400);

        const body: Payload = response.body;
        expect(body).to.have.property('message');
        expect(body.message).to.contain('deleted');
      });

      it('should allow updating origin multiple times', async () => {
        const conversationId = await createConversation();
        const attachment = await createTextAttachment(conversationId);

        await supertest
          .put(
            `/api/agent_builder/conversations/${conversationId}/attachments/${attachment.id}/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'first-saved-object' } })
          .expect(200);

        const response = await supertest
          .put(
            `/api/agent_builder/conversations/${conversationId}/attachments/${attachment.id}/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'second-saved-object' } })
          .expect(200);

        const body: UpdateOriginResponse = response.body;
        expect(body.attachment.origin).to.eql({ saved_object_id: 'second-saved-object' });
      });

      it('should not create a new version when updating origin', async () => {
        const conversationId = await createConversation();
        const attachment = await createTextAttachment(conversationId);
        const originalVersion = attachment.current_version;

        const response = await supertest
          .put(
            `/api/agent_builder/conversations/${conversationId}/attachments/${attachment.id}/origin`
          )
          .set('kbn-xsrf', 'kibana')
          .send({ origin: { saved_object_id: 'saved-object-123' } })
          .expect(200);

        const body: UpdateOriginResponse = response.body;
        expect(body.attachment.current_version).to.equal(originalVersion);
        expect(body.attachment.versions.length).to.equal(1);
      });
    });
  });
}
