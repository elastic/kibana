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
    title: 'Sidebar History Conversation 1',
    userMessage: 'Hello, this is sidebar conversation 1',
    expectedResponse: 'Sidebar response for conversation 1',
  },
  {
    title: 'Sidebar History Conversation 2',
    userMessage: 'Hello, this is sidebar conversation 2',
    expectedResponse: 'Sidebar response for conversation 2',
  },
];

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');

  describe('Sidebar Conversation History', function () {
    let llmProxy: LlmProxy;
    const conversationIds: string[] = [];

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);

      // Use full-screen experience helper method to create conversations (this test suite is only testing the history navigation of the sidebar, not the 'creating' of conversations)
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
        ignore_unavailable: true,
      });
    });

    it('shows existing conversations in the menu', async () => {
      await agentBuilder.prepareEmbeddableSidebar();
      await agentBuilder.openEmbeddableMenu();

      // Both conversations should appear in the list
      await retry.try(async () => {
        await testSubjects.existOrFail(`agentBuilderEmbeddableConversation-${conversationIds[0]}`);
        await testSubjects.existOrFail(`agentBuilderEmbeddableConversation-${conversationIds[1]}`);
      });

      // Close the menu
      const browser = getService('browser');
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('can switch to an existing conversation and see its messages', async () => {
      await agentBuilder.prepareEmbeddableSidebar();

      // Select the first conversation by ID
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.selectEmbeddableConversation(conversationIds[0]);

      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(CONVERSATION_DATA[0].expectedResponse);
      });

      // Switch to the second conversation by ID
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.selectEmbeddableConversation(conversationIds[1]);

      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(CONVERSATION_DATA[1].expectedResponse);
      });
    });

    it('search filters the conversation list', async () => {
      await agentBuilder.prepareEmbeddableSidebar();
      await agentBuilder.openEmbeddableMenu();

      // Type part of the first conversation's title in the search box
      const searchInput = await testSubjects.find('agentBuilderEmbeddableConversationSearch');
      await searchInput.type('Conversation 1');

      // First conversation should still be visible
      await retry.try(async () => {
        await testSubjects.existOrFail(`agentBuilderEmbeddableConversation-${conversationIds[0]}`);
      });

      // Second conversation should be hidden (filtered out)
      await retry.try(async () => {
        await testSubjects.missingOrFail(
          `agentBuilderEmbeddableConversation-${conversationIds[1]}`
        );
      });

      // Clear the search
      await searchInput.clearValueWithKeyboard();

      // Both conversations should be visible again
      await retry.try(async () => {
        await testSubjects.existOrFail(`agentBuilderEmbeddableConversation-${conversationIds[0]}`);
        await testSubjects.existOrFail(`agentBuilderEmbeddableConversation-${conversationIds[1]}`);
      });

      // Close menu
      const browser = getService('browser');
      await browser.pressKeys(browser.keys.ESCAPE);
    });
  });
}
