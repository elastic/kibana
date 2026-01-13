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

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');

  describe('Conversation Flow', function () {
    let llmProxy: LlmProxy;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);
    });

    after(async () => {
      llmProxy.close();
      await deleteConnectors(supertest);
      // Clean up all conversations
      await es.deleteByQuery({
        index: '.chat-conversations',
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
      });
    });

    it('navigates to new conversation page and shows initial state', async () => {
      await agentBuilder.navigateToApp('conversations/new');

      // Assert the welcome page is displayed
      await testSubjects.existOrFail('agentBuilderWelcomePage');

      // Assert the text input box renders
      await testSubjects.existOrFail('agentBuilderConversationInputForm');

      // Assert the default agent is "Elastic AI Agent"
      await testSubjects.existOrFail('agentBuilderAgentSelectorButton');
      const agentButton = await testSubjects.find('agentBuilderAgentSelectorButton');
      const agentText = await agentButton.getVisibleText();
      expect(agentText).to.contain('Elastic AI Agent');
    });

    it('sends a message with tool call and receives response with thinking', async () => {
      const MOCKED_INPUT = 'search for test data';
      const MOCKED_RESPONSE = 'I found test data using the search tool';
      const MOCKED_TITLE = 'Test Search Conversation';

      // Create conversation with tool calls
      const conversationId = await agentBuilder.createConversationViaUI(
        MOCKED_TITLE,
        MOCKED_INPUT,
        MOCKED_RESPONSE,
        llmProxy,
        true
      );

      // Wait for UI to include the response, title, and updated conversation list
      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(MOCKED_RESPONSE);

        const titleElement = await testSubjects.find('agentBuilderConversationTitle');
        const titleText = await titleElement.getVisibleText();
        expect(titleText).to.contain(MOCKED_TITLE);

        await agentBuilder.openConversationsHistory();
        // Wait for the conversation to appear in the list
        await retry.try(async () => {
          const conversationList = await testSubjects.find('agentBuilderConversationList');
          const conversationText = await conversationList.getVisibleText();
          expect(conversationText).to.contain(MOCKED_TITLE);
        });
      });

      await agentBuilder.clickThinkingToggle();

      // Wait for the expanded thinking details to appear
      await retry.try(async () => {
        const thinkingPanelElement = await testSubjects.find('agentBuilderThinkingPanel');
        const thinkingPanelText = await thinkingPanelElement.getVisibleText();

        // Check that the tool call details are visible
        expect(thinkingPanelText).to.contain('Calling tool platform.core.search');
      });

      // Click the "new" button
      await agentBuilder.clickNewConversationButton();

      // Wait for navigation to complete and assert we're back to the initial state with a populated conversation list
      await retry.try(async () => {
        // The conversation list should still contain our previous conversation
        const isConversationInHistory = await agentBuilder.isConversationInHistory(conversationId);
        expect(isConversationInHistory).to.be(true);

        // Assert the welcome page is displayed
        await testSubjects.existOrFail('agentBuilderWelcomePage');
      });
    });
  });
}
