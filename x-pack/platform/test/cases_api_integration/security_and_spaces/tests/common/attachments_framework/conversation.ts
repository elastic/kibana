/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL,
} from '@kbn/cases-plugin/common/constants';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants/attachments';
import type { AttachmentRequestV2 } from '@kbn/cases-plugin/common/types/api';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getComment,
} from '../../../../common/lib/api';
import { secOnly, superUser } from '../../../../common/lib/authentication/users';

const AGENT_BUILDER_API_VERSION = '2023-10-31';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  const createConversation = async (title: string): Promise<{ id: string; agent_id: string }> => {
    const { body } = await supertest
      .post('/api/agent_builder/conversations')
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', AGENT_BUILDER_API_VERSION)
      .send({ title })
      .expect(200);
    return body;
  };

  const conversationPayload = (attachmentId: string) =>
    ({
      type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
      owner: 'securitySolutionFixture',
      attachmentId,
    } as unknown as AttachmentRequestV2);

  // `agentBuilder.conversation` references an Agent Builder conversation. The
  // server verifies the requester can read it and stamps its title and agent
  // onto the metadata, so callers only send the conversation id.
  describe('Agent Builder conversation attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('attaches a readable conversation and resolves its title and agent', async () => {
      const conversation = await createConversation('Suspicious login');
      const postedCase = await createCase(supertest, postCaseReq);

      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: conversationPayload(conversation.id),
      });

      const attachment = patchedCase.comments![0] as unknown as {
        id: string;
        type: string;
        attachmentId: string;
        metadata: { title: string; agentId: string };
      };
      expect(attachment.type).to.eql(AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE);
      expect(attachment.attachmentId).to.eql(conversation.id);
      expect(attachment.metadata).to.eql({
        title: 'Suspicious login',
        agentId: conversation.agent_id,
      });

      const unifiedSOs = await es.search({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        query: { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${attachment.id}` } },
      });
      expect(unifiedSOs.hits.hits.length).to.be(1);

      const fetched = (await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: attachment.id,
      })) as unknown as { attachmentId: string; metadata: { title: string } };
      expect(fetched.attachmentId).to.be(conversation.id);
      expect(fetched.metadata.title).to.be('Suspicious login');
    });

    it('rejects a conversation the requester cannot read', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      await createComment({
        supertest,
        caseId: postedCase.id,
        params: conversationPayload('does-not-exist'),
        expectedHttpCode: 400,
      });
    });

    it('rejects unknown metadata keys', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      await createComment({
        supertest,
        caseId: postedCase.id,
        params: {
          ...conversationPayload('conversation-1'),
          metadata: { soType: 'search' },
        } as unknown as AttachmentRequestV2,
        expectedHttpCode: 400,
      });
    });

    describe('bulk get readable conversations', () => {
      it('returns only the conversations the requester can open', async () => {
        const conversation = await createConversation('Readable');

        const { body } = await supertest
          .post(INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: [conversation.id, 'does-not-exist'] })
          .expect(200);

        expect(body).to.eql({
          conversations: [
            {
              id: conversation.id,
              title: 'Readable',
              agent_id: conversation.agent_id,
              access_mode: 'private',
            },
          ],
        });
      });

      it('requires the Agent Builder read privilege', async () => {
        await supertestWithoutAuth
          .post(INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL)
          .auth(secOnly.username, secOnly.password)
          .set('kbn-xsrf', 'true')
          .send({ ids: ['conversation-1'] })
          .expect(403);
      });

      it('rejects an empty id list', async () => {
        await supertestWithoutAuth
          .post(INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL)
          .auth(superUser.username, superUser.password)
          .set('kbn-xsrf', 'true')
          .send({ ids: [] })
          .expect(400);
      });
    });
  });
};
