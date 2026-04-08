/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import { createLlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import {
  setupAgentDirectAnswer,
  setupAgentDirectError,
} from '../../../agent_builder_api_integration/utils/proxy_scenario';
import { createConnector, deleteConnectors } from '../../utils/connector_helpers';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');

  describe('Sidebar Error Handling', function () {
    let llmProxy: LlmProxy;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await deleteConnectors(supertest);
      await createConnector(llmProxy, supertest);
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

    it('shows an error message and allows the user to retry', async () => {
      const MOCKED_INPUT = 'sidebar error test message';
      const MOCKED_RESPONSE = 'Successful response after retry';
      const MOCKED_TITLE = 'Sidebar Error Retry Test';

      await agentBuilder.prepareEmbeddableSidebarWithNewChat();

      // Setup the LLM proxy to return an error
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Error should be visible
      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.find('agentBuilderRoundError');
      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      // Setup a successful response for the retry
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: MOCKED_RESPONSE,
      });

      // Click retry
      await agentBuilder.clickRetryButton();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for the successful response
      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(MOCKED_RESPONSE);
      });

      // Error should no longer be visible
      await retry.try(async () => {
        const isErrorStillVisible = await agentBuilder.isErrorVisible();
        expect(isErrorStillVisible).to.be(false);
      });
    });

    it('can start a new chat when there is an error', async () => {
      const MOCKED_INPUT = 'sidebar error before new chat';
      const MOCKED_RESPONSE = 'Successful response in new chat';
      const MOCKED_TITLE = 'Sidebar New Chat After Error';

      await agentBuilder.prepareEmbeddableSidebarWithNewChat();

      // Setup error
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Error should be visible
      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      // Open menu and click "New chat"
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.clickEmbeddableNewChatButton();

      // Should be back to the initial state (no error, input form ready)
      await retry.try(async () => {
        const hasError = await agentBuilder.isErrorVisible();
        expect(hasError).to.be(false);
      });

      await testSubjects.existOrFail('agentBuilderConversationInputForm');

      // Send a successful message in the new chat
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

    it('an error does not persist when switching to another conversation', async () => {
      const SUCCESSFUL_INPUT = 'successful sidebar message';
      const SUCCESSFUL_RESPONSE = 'Successful sidebar response';
      const SUCCESSFUL_TITLE = 'Successful Sidebar Conversation';

      const ERROR_INPUT = 'error message in sidebar';

      // Create a successful conversation via the full-screen experience
      const successfulConversationId = await agentBuilder.createConversationViaUI(
        SUCCESSFUL_TITLE,
        SUCCESSFUL_INPUT,
        SUCCESSFUL_RESPONSE,
        llmProxy
      );

      // Navigate to home and open the sidebar to continue the test there
      await agentBuilder.prepareEmbeddableSidebarWithNewChat();

      await retry.try(async () => {
        const hasError = await agentBuilder.isErrorVisible();
        expect(hasError).to.be(false);
      });

      // Trigger an error in the new conversation
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(ERROR_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Error should be visible in the current conversation
      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      // Switch back to the successful conversation by ID
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.selectEmbeddableConversation(successfulConversationId);

      // Error should not be visible in the successful conversation
      await retry.try(async () => {
        const isErrorVisibleInSuccessful = await agentBuilder.isErrorVisible();
        expect(isErrorVisibleInSuccessful).to.be(false);
      });

      // The successful response should still be visible
      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(SUCCESSFUL_RESPONSE);
      });
    });

    it('keeps previous conversation rounds visible when there is an error', async () => {
      const FIRST_INPUT = 'first successful sidebar message';
      const FIRST_RESPONSE = 'First successful sidebar response';
      const FIRST_TITLE = 'Previous Rounds Sidebar Test';

      const ERROR_INPUT = 'error message after success';

      // Create the first conversation via the full-screen experience
      const firstConversationId = await agentBuilder.createConversationViaUI(
        FIRST_TITLE,
        FIRST_INPUT,
        FIRST_RESPONSE,
        llmProxy
      );

      // Navigate to home, open the sidebar, and switch to the created conversation
      await agentBuilder.prepareEmbeddableSidebar();
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.selectEmbeddableConversation(firstConversationId);

      // Assert the first round is visible
      await retry.try(async () => {
        const firstResponseElement = await testSubjects.find('agentBuilderRoundResponse');
        const firstResponseText = await firstResponseElement.getVisibleText();
        expect(firstResponseText).to.contain(FIRST_RESPONSE);
      });

      // Trigger an error in the same conversation
      await setupAgentDirectError({
        proxy: llmProxy,
        continueConversation: true,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(ERROR_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Error should be visible
      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      // The previous successful round should still be visible
      const previousResponseElement = await testSubjects.find('agentBuilderRoundResponse');
      const previousResponseText = await previousResponseElement.getVisibleText();
      expect(previousResponseText).to.contain(FIRST_RESPONSE);
    });
  });
}
