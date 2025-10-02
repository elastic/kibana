/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

const APP_ID = 'agent_builder';
const MOCKED_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'Conversation1',
    user_message: 'Hello, this is conversation 1',
    assistant_response: 'This is the response for conversation 1',
  },
  {
    id: 'conv-2',
    title: 'Conversation2',
    user_message: 'Hello, this is conversation 2',
    assistant_response: 'This is the response for conversation 2',
  },
  {
    id: 'conv-3',
    title: 'Conversation3',
    user_message: 'Hello, this is conversation 3',
    assistant_response: 'This is the response for conversation 3',
  },
];

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const es = getService('es');

  describe('Conversation History', function () {
    beforeEach(async () => {
      const bulkBody = MOCKED_CONVERSATIONS.flatMap((conv) => [
        { index: { _index: '.chat-conversations', _id: conv.id } },
        {
          user_id: 'test_user',
          user_name: 'test_user',
          agent_id: 'elastic-ai-agent',
          space: 'default',
          title: conv.title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rounds: [
            {
              id: `${conv.id}-round-1`,
              input: { message: conv.user_message },
              steps: [],
              response: { message: conv.assistant_response },
            },
          ],
        },
      ]);

      await es.bulk({ body: bulkBody, refresh: true });
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.chat-conversations',
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
      });
    });

    it('can navigate between multiple conversations in the conversation history', async () => {
      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      // Wait for conversations to load
      await retry.try(async () => {
        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain('Conversation1');
        expect(conversationText).to.contain('Conversation2');
        expect(conversationText).to.contain('Conversation3');
      });

      // Test navigating between all 3 conversations
      for (const conv of MOCKED_CONVERSATIONS) {
        const convButton = await testSubjects.find(`conversationItem-${conv.id}`);
        await convButton.click();

        await retry.try(async () => {
          const titleElement = await testSubjects.find('agentBuilderConversationTitle');
          const titleText = await titleElement.getVisibleText();
          expect(titleText).to.contain(conv.title);

          const responseElement = await testSubjects.find('agentBuilderRoundResponse');
          const responseText = await responseElement.getVisibleText();
          expect(responseText).to.contain(conv.assistant_response);
        });
      }
    });
  });
}
