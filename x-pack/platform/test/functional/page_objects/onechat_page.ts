/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';

import type { FtrProviderContext } from '../ftr_provider_context';
import { FtrService } from '../ftr_provider_context';
import type { LlmProxy } from '../../onechat_api_integration/utils/llm_proxy';
import { toolCallMock } from '../../onechat_api_integration/utils/llm_proxy/mocks';

export class OneChatPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly common = this.ctx.getPageObject('common');

  constructor(ctx: FtrProviderContext) {
    super(ctx);
  }

  /**
   * Navigate to the OneChat app
   */
  async navigateToApp(path: string = 'conversations/new') {
    await this.common.navigateToApp('agent_builder', { path });
  }

  /**
   * Type a message in the conversation input
   */
  async typeMessage(message: string) {
    const inputElement = await this.testSubjects.find('onechatAppConversationInputFormTextArea');
    await inputElement.click();
    await inputElement.type(message);
  }

  /**
   * Send the current message
   */
  async sendMessage() {
    const sendButton = await this.testSubjects.find('onechatAppConversationInputFormSubmitButton');
    await sendButton.click();
  }

  /**
   * Extract conversation ID from the current browser URL
   */
  async getCurrentConversationIdFromUrl(): Promise<string> {
    return await this.retry.try(async () => {
      const url = await this.browser.getCurrentUrl();
      // URL should be something like: /app/agent_builder/conversations/{conversationId}
      const match = url.match(/\/conversations\/([^\/\?]+)/);
      if (!match) {
        throw new Error('Could not extract conversation ID from URL');
      }
      return match[1];
    });
  }

  /**
   * Create a conversation via the UI and return the conversation ID
   */
  async createConversationViaUI(
    title: string,
    userMessage: string,
    expectedResponse: string,
    llmProxy: LlmProxy,
    useToolCalls: boolean = false
  ): Promise<string> {
    // Navigate to new conversation
    await this.navigateToApp('conversations/new');

    // Set up title tool call
    void llmProxy.interceptors.toolChoice({
      name: 'set_title',
      response: toolCallMock('set_title', { title }),
    });

    if (useToolCalls) {
      // First interceptor: respond to user message with tool call
      void llmProxy.interceptors.userMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages)?.content as string;
          return lastMessage?.includes(userMessage);
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
        response: expectedResponse,
      });
    } else {
      // Simple response without tool calls
      void llmProxy.interceptors.userMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages)?.content as string;
          return lastMessage?.includes(userMessage);
        },
        response: expectedResponse,
      });
    }

    // Type and send the message
    await this.typeMessage(userMessage);
    await this.sendMessage();

    // Wait for all interceptors to be called (backend processing complete)
    await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

    // Wait for the response to appear in the UI
    await this.retry.try(async () => {
      await this.testSubjects.find('agentBuilderRoundResponse');
    });

    // Wait for URL to change to conversation page (not /conversations/new)
    await this.retry.try(async () => {
      const url = await this.browser.getCurrentUrl();
      if (url.includes('/conversations/new')) {
        throw new Error('Still on new conversation page');
      }
    });

    // Extract conversation ID from URL
    return await this.getCurrentConversationIdFromUrl();
  }

  /**
   * Navigate to an existing conversation by clicking on it in the history sidebar
   */
  async navigateToConversationViaHistory(conversationId: string) {
    const conversationItem = await this.testSubjects.find(`conversationItem-${conversationId}`);
    await conversationItem.click();
  }

  /**
   * Navigate to an existing conversation using the conversation ID in the URL
   */
  async navigateToConversationById(conversationId: string) {
    await this.navigateToApp(`conversations/${conversationId}`);
  }

  /**
   * Continue chatting in an existing conversation
   */
  async continueConversation(userMessage: string, expectedResponse: string, llmProxy: LlmProxy) {
    // Set up LLM proxy
    void llmProxy.interceptors.userMessage({
      when: ({ messages }) => {
        const lastMessage = last(messages)?.content as string;
        return lastMessage?.includes(userMessage);
      },
      response: expectedResponse,
    });

    // Type and send the message
    await this.typeMessage(userMessage);
    await this.sendMessage();

    // Wait for all interceptors to be called (backend processing complete)
    await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

    // Wait for the response to appear in the UI
    await this.retry.try(async () => {
      await this.testSubjects.find('agentBuilderRoundResponse');
    });
  }

  /**
   * Delete a conversation by hovering and clicking the delete button
   */
  async deleteConversation(conversationId: string) {
    const conversationItem = await this.testSubjects.find(`conversationItem-${conversationId}`);

    await conversationItem.moveMouseTo();

    const deleteButton = await this.testSubjects.find(
      `delete-conversation-button-${conversationId}`
    );
    await deleteButton.click();

    const confirmButton = await this.testSubjects.find('confirmModalConfirmButton');
    await confirmButton.click();

    // Wait for the conversation to be removed
    await this.retry.try(async () => {
      await this.testSubjects.missingOrFail(`conversationItem-${conversationId}`);
    });
  }

  /**
   * Check if a conversation exists in the history by conversation ID
   */
  async isConversationInHistory(conversationId: string): Promise<boolean> {
    try {
      await this.testSubjects.find(`conversationItem-${conversationId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Click the thinking toggle to expand thinking details
   */
  async clickThinkingToggle() {
    const thinkingToggle = await this.testSubjects.find('agentBuilderThinkingToggle');
    await thinkingToggle.click();
  }

  /**
   * Click the new conversation button
   */
  async clickNewConversationButton() {
    const newButton = await this.testSubjects.find('agentBuilderNewConversationButton');
    await newButton.click();
  }

  /**
   * Get the thinking details text
   */
  async getThinkingDetails() {
    const responseElement = await this.testSubjects.find('agentBuilderRoundResponse');
    return await responseElement.getVisibleText();
  }
}
