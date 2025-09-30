/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { last } from 'lodash';
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

    // Helper function to create a conversation
    async function createConversation(
      input: string,
      title: string,
      response: string,
      withToolCall = false
    ) {
      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      const inputField = await testSubjects.find('onechatAppConversationInputFormTextArea');
      await inputField.click();
      await inputField.type(input);

      void llmProxy.interceptors.toolChoice({
        name: 'set_title',
        response: toolCallMock('set_title', { title }),
      });

      if (withToolCall) {
        // First interceptor: respond to user message with tool call
        void llmProxy.interceptors.userMessage({
          when: ({ messages }) => {
            const lastMessage = last(messages)?.content as string;
            return lastMessage.includes(input);
          },
          response: toolCallMock('platform_core_search', {
            query: 'test data',
          }),
        });

        // Second interceptor: respond to tool message with final response
        void llmProxy.interceptors.toolMessage({
          when: ({ messages }) => {
            const lastMessage = last(messages);
            const contentParsed = JSON.parse(lastMessage?.content as string);
            return contentParsed?.results;
          },
          response,
        });
      } else {
        void llmProxy.interceptors.userMessage({ response });
      }

      const submitTextButton = await testSubjects.find(
        'onechatAppConversationInputFormSubmitButton'
      );
      await submitTextButton.click();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      return { title, response };
    }

    it('sends a message with tool call and receives response with thinking', async () => {
      const MOCKED_INPUT = 'search for test data';
      const MOCKED_RESPONSE = 'I found test data using the search tool';
      const MOCKED_TITLE = 'Test Search Conversation';

      const { title, response } = await createConversation(
        MOCKED_INPUT,
        MOCKED_TITLE,
        MOCKED_RESPONSE,
        true
      );

      // Wait for response with thinking to appear
      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(response);

        const titleElement = await testSubjects.find('agentBuilderConversationTitle');
        const titleText = await titleElement.getVisibleText();
        expect(titleText).to.contain(title);

        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain(title);
      });

      // Click on "Thinking completed" to expand the thinking details
      const thinkingToggle = await testSubjects.find('agentBuilderThinkingToggle');
      await thinkingToggle.click();

      // Wait for the expanded thinking details to appear
      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();

        // Check that the tool call details are visible
        expect(responseText).to.contain('Calling tool platform.core.search');
        expect(responseText).to.contain('Selecting the best target for this query');
      });

      // Now test clicking the "new" button
      const newButton = await testSubjects.find('agentBuilderNewConversationButton');
      await newButton.click();

      // Wait for navigation to complete and assert we're back to the initial state with a populated conversation list
      await retry.try(async () => {
        // The conversation list should still contain our previous conversation
        const conversationList = await testSubjects.find('agentBuilderConversationList');
        const conversationText = await conversationList.getVisibleText();
        expect(conversationText).to.contain(title);

        // Assert the welcome page is displayed
        await testSubjects.existOrFail('agentBuilderWelcomePage');
      });
    });
  });
}
