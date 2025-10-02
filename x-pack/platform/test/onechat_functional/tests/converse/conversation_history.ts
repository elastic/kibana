/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LlmProxy } from '../../../onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '../../../onechat_api_integration/utils/llm_proxy';
import { createConnector, deleteConnectors } from '../../utils/connector_helpers';
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
  const log = getService('log');
  const supertest = getService('supertest');

  describe('Conversation History', function () {
    let llmProxy: LlmProxy;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);
    });

    after(async () => {
      llmProxy.close();
      await deleteConnectors(supertest);
    });

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

    it('can delete conversations and updates conversation history', async () => {
      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      // Wait for conversations to load
      await retry.try(async () => {
        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain('Conversation1');
        expect(conversationText).to.contain('Conversation2');
        expect(conversationText).to.contain('Conversation3');
      });

      // Delete Conversation1
      const conv1Button = await testSubjects.find('conversationItem-conv-1');
      await conv1Button.moveMouseTo(); // Hover to show delete button

      const deleteConv1Button = await testSubjects.find('delete-conversation-button');
      await deleteConv1Button.click();

      // Confirm deletion in modal
      const confirmDeleteButton1 = await testSubjects.find('confirmModalConfirmButton');
      await confirmDeleteButton1.click();

      // Wait for Conversation1 to be removed (deletion to complete) and conversation list to update
      await retry.try(async () => {
        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).not.to.contain('Conversation1');
        expect(conversationText).to.contain('Conversation2');
        expect(conversationText).to.contain('Conversation3');
      });
    });

    it('can continue chatting in an existing conversation', async () => {
      const MOCKED_INPUT = 'hello conversation 2';
      const MOCKED_RESPONSE = 'responding from conversation 2';

      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      // Wait for conversations to load and assert all 3 are present
      await retry.try(async () => {
        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain('Conversation1');
        expect(conversationText).to.contain('Conversation2');
        expect(conversationText).to.contain('Conversation3');
      });

      // Select Conversation2
      const conv2Button = await testSubjects.find('conversationItem-conv-2');
      await conv2Button.click();

      // Wait for Conversation2 to load and assert its content
      await retry.try(async () => {
        const titleElement = await testSubjects.find('agentBuilderConversationTitle');
        const titleText = await titleElement.getVisibleText();
        expect(titleText).to.contain('Conversation2');

        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain('This is the response for conversation 2');
      });

      // Set up LLM proxy to respond to the new message
      void llmProxy.interceptors.userMessage({
        when: ({ messages }) => {
          const lastMessage = messages[messages.length - 1]?.content as string;
          return lastMessage.includes(MOCKED_INPUT);
        },
        response: MOCKED_RESPONSE,
      });

      // Type and send the new message
      const inputField = await testSubjects.find('onechatAppConversationInputFormTextArea');
      await inputField.click();
      await inputField.type(MOCKED_INPUT);

      const submitTextButton = await testSubjects.find(
        'onechatAppConversationInputFormSubmitButton'
      );
      await submitTextButton.click();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for the new message and response to appear
      await retry.try(async () => {
        // Find all round responses and get the last one (most recent)
        const responseElements = await testSubjects.findAll('agentBuilderRoundResponse');
        const lastResponseElement = responseElements[responseElements.length - 1];
        const responseText = await lastResponseElement.getVisibleText();
        expect(responseText).to.contain(MOCKED_RESPONSE);
      });
    });

    it('does not allow continuing to chat if the agent cannot be found', async () => {
      // Insert a conversation with a deleted agent
      const bulkBody = [
        { index: { _index: '.chat-conversations', _id: 'conv-4' } },
        {
          user_id: 'test_user',
          user_name: 'test_user',
          agent_id: 'deleted_agent',
          space: 'default',
          title: 'Conversation4',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rounds: [
            {
              id: 'conv-4-round-1',
              input: { message: 'Hello, this is conversation 4' },
              steps: [],
              response: { message: 'This is the response for conversation 4' },
            },
          ],
        },
      ];

      await es.bulk({ body: bulkBody, refresh: true });

      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      // Wait for conversations to load and assert Conversation4 is present
      await retry.try(async () => {
        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain('Conversation4');
      });

      // Click on Conversation4
      const conv4Button = await testSubjects.find('conversationItem-conv-4');
      await conv4Button.click();

      // Wait for Conversation4 to load
      await retry.try(async () => {
        const titleElement = await testSubjects.find('agentBuilderConversationTitle');
        const titleText = await titleElement.getVisibleText();
        expect(titleText).to.contain('Conversation4');
      });

      // Assert the input field is disabled and has the correct placeholder
      const inputField = await testSubjects.find('onechatAppConversationInputFormTextArea');

      // Check if the textarea is disabled by checking the disabled attribute
      const isDisabled = await inputField.getAttribute('disabled');
      expect(isDisabled).to.be('true');

      const placeholder = await inputField.getAttribute('placeholder');
      expect(placeholder).to.contain(
        'Agent "deleted_agent" has been deleted. Please start a new conversation.'
      );

      // Clean up the test conversation
      await es.deleteByQuery({
        index: '.chat-conversations',
        query: { term: { _id: 'conv-4' } },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
      });
    });
  });
}
