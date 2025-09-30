/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LlmProxy } from '../../../onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '../../../onechat_api_integration/utils/llm_proxy';
import { toolCallMock } from '../../../onechat_api_integration/utils/llm_proxy/mocks';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

// Basic auth connector functions
async function createConnector(proxy: LlmProxy, supertest: any) {
  await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'foo',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'myApiKey' },
      connector_type_id: '.gen-ai',
    })
    .expect(200);
}

async function deleteConnectors(supertest: any) {
  const connectors = await supertest.get('/api/actions/connectors').expect(200);
  const promises = connectors.body.map((connector: { id: string }) => {
    return supertest
      .delete(`/api/actions/connector/${connector.id}`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  });

  return Promise.all(promises);
}

const APP_ID = 'agent_builder';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');

  describe('Agent Builder Simple Conversation', function () {
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
      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      // Assert the conversation list is empty and shows the no conversations message
      const dataTestSubj = 'agentBuilderNoConversationsMessage';
      await testSubjects.existOrFail(dataTestSubj);
      const noConversationsElement = await testSubjects.find(dataTestSubj);
      const noConversationsText = await noConversationsElement.getVisibleText();
      expect(noConversationsText).to.contain("You haven't started any conversations yet.");

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

    it('sends a message, receives response, and can start new conversation', async () => {
      const MOCKED_INPUT = 'hello world';
      const MOCKED_LLM_RESPONSE = 'hello world received';
      const MOCKED_LLM_TITLE = 'Test Conversation 1';

      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      const inputField = await testSubjects.find('onechatAppConversationInputFormTextArea');
      await inputField.click();
      await inputField.type(MOCKED_INPUT);

      // Set up LLM proxy interceptors
      void llmProxy.interceptors.toolChoice({
        name: 'set_title',
        response: toolCallMock('set_title', { title: MOCKED_LLM_TITLE }),
      });

      void llmProxy.interceptors.userMessage({ response: MOCKED_LLM_RESPONSE });

      // Send the message
      const submitTextButton = await testSubjects.find(
        'onechatAppConversationInputFormSubmitButton'
      );
      await submitTextButton.click();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for the response, title, and conversation list to appear in the UI
      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(MOCKED_LLM_RESPONSE);

        const titleElement = await testSubjects.find('agentBuilderConversationTitle');
        const titleText = await titleElement.getVisibleText();
        expect(titleText).to.contain(MOCKED_LLM_TITLE);

        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain(MOCKED_LLM_TITLE);
      });

      // Clicking the "new" button to start a new conversation
      const newButton = await testSubjects.find('agentBuilderNewConversationButton');
      await newButton.click();

      // Wait for navigation to complete and assert we're back to the initial state
      await retry.try(async () => {
        // The conversation list should still contain our previous conversation
        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain(MOCKED_LLM_TITLE);

        // Assert the welcome page is displayed
        await testSubjects.existOrFail('agentBuilderWelcomePage');
      });
    });
  });
}
