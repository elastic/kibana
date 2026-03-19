/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import { createLlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import { createConnector, deleteConnectors } from '../../utils/connector_helpers';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

const CONVERSATION_DATA = [
  {
    title: 'Conversation1',
    userMessage: 'Hello, this is conversation 1',
    expectedResponse: 'This is the response for conversation 1',
  },
  {
    title: 'Conversation2',
    userMessage: 'Hello, this is conversation 2',
    expectedResponse: 'This is the response for conversation 2',
  },
  {
    title: 'Conversation3',
    userMessage: 'Hello, this is conversation 3',
    expectedResponse: 'This is the response for conversation 3',
  },
];

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');

  // FLAKY: https://github.com/elastic/kibana/issues/252238
  describe.skip('Conversation History', function () {
    let llmProxy: LlmProxy;
    const conversationIds: string[] = [];

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);

      // Create conversations once for all tests
      for (const conv of CONVERSATION_DATA) {
        const conversationId = await agentBuilder.createConversationViaUI(
          conv.title,
          conv.userMessage,
          conv.expectedResponse,
          llmProxy
        );
        conversationIds.push(conversationId);
      }
    });

    after(async () => {
      llmProxy.close();
      await deleteConnectors(supertest);
      await es.deleteByQuery({
        index: '.chat-conversations',
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
      });
    });

    it('can navigate between multiple conversations using the conversation history', async () => {
      // Assert all conversations are in the history
      expect(await agentBuilder.isConversationInHistory(conversationIds[0])).to.be(true);
      expect(await agentBuilder.isConversationInHistory(conversationIds[1])).to.be(true);
      expect(await agentBuilder.isConversationInHistory(conversationIds[2])).to.be(true);

      // Test navigating between all 3 conversations using the conversation history sidebar
      for (let i = 0; i < CONVERSATION_DATA.length; i++) {
        const conv = CONVERSATION_DATA[i];
        const convId = conversationIds[i];

        // Navigate to the conversation
        await agentBuilder.navigateToConversationViaHistory(convId);

        // Wait for conversation content to load
        await retry.try(async () => {
          await testSubjects.find('agentBuilderRoundResponse');
        });

        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(conv.expectedResponse);
      }
    });

    it('can navigate between multiple conversations using the conversation ID in the URL', async () => {
      // Test navigating between all 3 conversations using the URL with conversation ID
      for (let i = 0; i < CONVERSATION_DATA.length; i++) {
        const conv = CONVERSATION_DATA[i];
        const convId = conversationIds[i];

        // Click on the conversation in the history sidebar
        await agentBuilder.navigateToConversationById(convId);

        // Wait for conversation content to load
        await retry.try(async () => {
          await testSubjects.find('agentBuilderRoundResponse');
        });

        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(conv.expectedResponse);
      }
    });

    it('can continue chatting in an existing conversation', async () => {
      const MOCKED_INPUT = 'User message continuing conversation';
      const MOCKED_RESPONSE = 'LLM response continuing the conversation';

      const conversationIdToContinue = conversationIds[1];
      await agentBuilder.navigateToConversationViaHistory(conversationIdToContinue);

      // Continue the conversation with a new message
      await agentBuilder.continueConversation(MOCKED_INPUT, MOCKED_RESPONSE, llmProxy);

      // Assert the new response content (continueConversation already waits for it)
      const responseElements = await testSubjects.findAll('agentBuilderRoundResponse');
      const lastResponseElement = responseElements[responseElements.length - 1];
      const responseText = await lastResponseElement.getVisibleText();
      expect(responseText).to.contain(MOCKED_RESPONSE);
    });

    it('can delete conversations and updates conversation history', async () => {
      const conversationIdToDelete = conversationIds[0];
      await agentBuilder.deleteConversation(conversationIdToDelete);

      // Wait for the deleted conversation to disappear from history (wait for refetch to complete)
      await retry.try(async () => {
        const isInHistory = await agentBuilder.isConversationInHistory(conversationIdToDelete);
        expect(isInHistory).to.be(false);
      });

      // Assert the remaining conversations are still in history
      expect(await agentBuilder.isConversationInHistory(conversationIds[1])).to.be(true);
      expect(await agentBuilder.isConversationInHistory(conversationIds[2])).to.be(true);
    });

    it('can rename a conversation and the title updates correctly', async () => {
      const conversationIdToRename = conversationIds[1];
      const newTitle = 'Renamed Conversation Title';

      // Navigate to the conversation
      await agentBuilder.navigateToConversationViaHistory(conversationIdToRename);

      // Wait for conversation content to load
      await retry.try(async () => {
        await testSubjects.find('agentBuilderRoundResponse');
      });

      // Rename the conversation
      const updatedTitle = await agentBuilder.renameConversation(newTitle);

      // Assert the title was updated correctly
      expect(updatedTitle).to.be(newTitle);
    });

    it.skip('does not allow continuing to chat if the agent cannot be found', async () => {
      // 1. Add new agent
      // 2. Create new conversation with that agent
      // 3. Go to /agents
      // 4. Delete agent created in step 1
      // 5. Go to conversations/:conversationId
      // 6. Assert it's disabled
    });
  });
}
