/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENT_BUILDER_TOUR_STORAGE_KEY } from '@kbn/agent-builder-plugin/public/application/storage_keys';
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
  const browser = getService('browser');

  // Failing: See https://github.com/elastic/kibana/issues/248076
  describe.skip('Conversation Error Handling', function () {
    let llmProxy: LlmProxy;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);
      await agentBuilder.navigateToApp('conversations/new');
      await browser.setLocalStorageItem(AGENT_BUILDER_TOUR_STORAGE_KEY, 'true');
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

    it('shows error message when there is an error and allows user to retry', async () => {
      const MOCKED_INPUT = 'test error message';
      const MOCKED_RESPONSE = 'This is a successful response after retry';
      const MOCKED_TITLE = 'Error Handling Test';

      await agentBuilder.navigateToApp('conversations/new');

      // setup interceptors to return 400 error
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      // Wait for all interceptors to be called (backend processing complete)
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.find('agentBuilderRoundError');
      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      // Now set up the LLM proxy to work correctly for the retry
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: MOCKED_RESPONSE,
      });

      // Click the retry button
      await agentBuilder.clickRetryButton();

      // Wait for all interceptors to be called (backend processing complete)
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for the successful response to appear
      await retry.try(async () => {
        await testSubjects.find('agentBuilderRoundResponse');
      });

      // Assert the successful response is visible
      const responseElement = await testSubjects.find('agentBuilderRoundResponse');
      const responseText = await responseElement.getVisibleText();
      expect(responseText).to.contain(MOCKED_RESPONSE);

      // Assert the error is no longer visible
      const isErrorStillVisible = await agentBuilder.isErrorVisible();
      expect(isErrorStillVisible).to.be(false);
    });

    it('shows a "not found" prompt when conversation ID does not exist', async () => {
      const INVALID_ID = 'this-id-does-not-exist-12345';
      const initialUrl = await browser.getCurrentUrl();

      await agentBuilder.navigateToApp(`conversations/${INVALID_ID}`);

      await testSubjects.existOrFail('errorPrompt');

      const errorTitle = await testSubjects.getVisibleText('errorPromptTitle');
      expect(errorTitle).to.be('Conversation not found');

      await testSubjects.existOrFail('startNewConversationButton');
      await testSubjects.click('startNewConversationButton');

      await retry.try(async () => {
        const newUrl = await browser.getCurrentUrl();
        expect(newUrl).to.not.equal(initialUrl);
        expect(newUrl).to.contain('conversations/new');
      });
      await testSubjects.existOrFail('agentBuilderWelcomePage');
    });

    it('can start a new conversation when there is an error', async () => {
      const MOCKED_INPUT = 'test error message for new conversation';
      const MOCKED_RESPONSE = 'This is a successful response in new conversation';
      const MOCKED_TITLE = 'New Conversation After Error';

      await agentBuilder.navigateToApp('conversations/new');

      // setup interceptors to return 400 error
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      // Wait for all interceptors to be called (backend processing complete)
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for error to appear
      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.find('agentBuilderRoundError');
      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      await agentBuilder.clickNewConversationButton();

      // Wait for navigation to complete and assert we're back to the initial state
      await retry.try(async () => {
        await testSubjects.existOrFail('agentBuilderWelcomePage');
      });

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: MOCKED_RESPONSE,
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await retry.try(async () => {
        await testSubjects.find('agentBuilderRoundResponse');
      });

      const responseElement = await testSubjects.find('agentBuilderRoundResponse');
      const responseText = await responseElement.getVisibleText();
      expect(responseText).to.contain(MOCKED_RESPONSE);
    });

    it('an error does not persist across conversations', async () => {
      const SUCCESSFUL_INPUT = 'successful conversation message';
      const SUCCESSFUL_RESPONSE = 'This is a successful response';
      const SUCCESSFUL_TITLE = 'Successful Conversation';

      const ERROR_INPUT = 'error conversation message';

      // Create a successful conversation first
      const successfulConversationId = await agentBuilder.createConversationViaUI(
        SUCCESSFUL_TITLE,
        SUCCESSFUL_INPUT,
        SUCCESSFUL_RESPONSE,
        llmProxy
      );

      // Now create a new conversation that will have an error
      await agentBuilder.clickNewConversationButton();

      await retry.try(async () => {
        await testSubjects.existOrFail('agentBuilderWelcomePage');
      });

      // setup interceptors to return 400 error
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(ERROR_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.find('agentBuilderRoundError');
      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      // Navigate back to the successful conversation
      await agentBuilder.navigateToConversationViaHistory(successfulConversationId);

      const isErrorVisibleInSuccessful = await agentBuilder.isErrorVisible();
      expect(isErrorVisibleInSuccessful).to.be(false);

      const responseElement = await testSubjects.find('agentBuilderRoundResponse');
      const responseText = await responseElement.getVisibleText();
      expect(responseText).to.contain(SUCCESSFUL_RESPONSE);
    });

    it('clears the error when the user sends a new message', async () => {
      const ERROR_INPUT = 'error message';
      const NEW_INPUT = 'new message after error';
      const NEW_RESPONSE = 'This is a successful response after error';
      const MOCKED_TITLE = 'Error Cleared Test';

      await agentBuilder.navigateToApp('conversations/new');

      // setup interceptors to return 400 error
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(ERROR_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Assert error is visible
      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.find('agentBuilderRoundError');
      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      // Now set up interceptors for the new message
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: NEW_RESPONSE,
      });

      // Send a new message instead of retrying
      await agentBuilder.typeMessage(NEW_INPUT);
      await agentBuilder.sendMessage();

      // Wait for all interceptors to be called (backend processing complete)
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for the successful response to appear
      await retry.try(async () => {
        await testSubjects.find('agentBuilderRoundResponse');
      });

      // Assert the error is cleared and no longer visible
      const isErrorStillVisible = await agentBuilder.isErrorVisible();
      expect(isErrorStillVisible).to.be(false);
    });

    it('keeps the previous conversation rounds visible when there is an error', async () => {
      const FIRST_INPUT = 'first successful message';
      const FIRST_RESPONSE = 'This is the first successful response';
      const FIRST_TITLE = 'Previous Rounds Test';

      const ERROR_INPUT = 'error message';

      // Create a conversation with a successful first round
      await agentBuilder.createConversationViaUI(
        FIRST_TITLE,
        FIRST_INPUT,
        FIRST_RESPONSE,
        llmProxy
      );

      // Assert the first round is visible
      const firstResponseElement = await testSubjects.find('agentBuilderRoundResponse');
      const firstResponseText = await firstResponseElement.getVisibleText();
      expect(firstResponseText).to.contain(FIRST_RESPONSE);

      // setup interceptors to return 400 error
      await setupAgentDirectError({
        proxy: llmProxy,
        continueConversation: true,
        error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
      });

      await agentBuilder.typeMessage(ERROR_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Assert error is visible
      const isErrorVisible = await agentBuilder.isErrorVisible();
      expect(isErrorVisible).to.be(true);

      await testSubjects.find('agentBuilderRoundError');
      await testSubjects.existOrFail('agentBuilderRoundErrorRetryButton');

      // Assert the previous round is still visible
      const previousResponseElement = await testSubjects.find('agentBuilderRoundResponse');
      const previousResponseText = await previousResponseElement.getVisibleText();
      expect(previousResponseText).to.contain(FIRST_RESPONSE);
    });
  });
}
