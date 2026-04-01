/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import { createLlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import { setupAgentDirectAnswer } from '../../../agent_builder_api_integration/utils/proxy_scenario';
import { createConnector, deleteConnectors } from '../../utils/connector_helpers';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');

  describe('Sidebar Conversation Flow', function () {
    let llmProxy: LlmProxy;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);
      // Navigate to home — sidebar tests must NOT be on the agent builder app
      // to avoid clashing with full-screen conversation components sharing the same data-test-subj
      await agentBuilder.navigateToHome();
      // Open the sidebar and reset to a fresh conversation — the sidebar persists
      // the last agent and conversation ID so we always clear state before starting
      await agentBuilder.openEmbeddableSidebar();
      await agentBuilder.waitForEmbeddableSidebarOpen();
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.clickEmbeddableNewChatButton();
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

    it('shows initial state', async () => {
      // The menu button should be visible (part of the embeddable header)
      await testSubjects.existOrFail('agentBuilderEmbeddableMenuButton');

      // The conversation input form should be visible
      await testSubjects.existOrFail('agentBuilderConversationInputForm');
    });

    it('sends a message and receives a response', async () => {
      const MOCKED_INPUT = 'hello from the sidebar';
      const MOCKED_RESPONSE = 'This is the sidebar response';
      const MOCKED_TITLE = 'Sidebar Flow Test';

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: MOCKED_RESPONSE,
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for the response to appear in the sidebar
      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(MOCKED_RESPONSE);
      });
    });

    it('can start a new chat from the menu', async () => {
      // Open the menu popover
      await agentBuilder.openEmbeddableMenu();

      // Click "New chat"
      await agentBuilder.clickEmbeddableNewChatButton();

      // Input form should still be visible (new empty conversation)
      await testSubjects.existOrFail('agentBuilderConversationInputForm');

      // No response should be visible (new conversation)
      const hasResponse = await testSubjects.exists('agentBuilderRoundResponse');
      expect(hasResponse).to.be(false);
    });

    it('can send a message after starting a new conversation from the menu', async () => {
      const MOCKED_INPUT = 'message after new chat';
      const MOCKED_RESPONSE = 'Response after new chat';
      const MOCKED_TITLE = 'Post New Chat Conversation';

      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.clickEmbeddableNewChatButton();

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: MOCKED_RESPONSE,
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(MOCKED_RESPONSE);
      });
    });
  });
}
