/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/onechat-common';
import { AGENT_BUILDER_APP_ID } from '../../onechat/common/constants';
import type { FtrProviderContext } from '../ftr_provider_context';
import { FtrService } from '../ftr_provider_context';
import type { LlmProxy } from '../../onechat_api_integration/utils/llm_proxy';
import {
  setupAgentDirectAnswer,
  setupAgentCallSearchToolWithNoIndexSelectedThenAnswer,
} from '../../onechat_api_integration/utils/proxy_scenario';

export class OneChatPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly common = this.ctx.getPageObject('common');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');

  constructor(ctx: FtrProviderContext) {
    super(ctx);
  }

  /**
   * Navigate to the OneChat app
   */
  async navigateToApp(path: string = 'conversations/new') {
    await this.common.navigateToApp(AGENT_BUILDER_APP_ID, { path });
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
    withToolCall: boolean = false
  ): Promise<string> {
    // Navigate to new conversation
    await this.navigateToApp('conversations/new');

    await (withToolCall
      ? setupAgentCallSearchToolWithNoIndexSelectedThenAnswer({
          proxy: llmProxy,
          title,
          response: expectedResponse,
        })
      : setupAgentDirectAnswer({ proxy: llmProxy, title, response: expectedResponse }));

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
    await setupAgentDirectAnswer({
      proxy: llmProxy,
      response: expectedResponse,
      continueConversation: true,
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

  /**
   * Click the retry button in the error UI
   */
  async clickRetryButton() {
    const retryButton = await this.testSubjects.find('agentBuilderRoundErrorRetryButton');
    await retryButton.click();
  }

  /**
   * Check if the error UI is visible
   */
  async isErrorVisible() {
    return await this.testSubjects.exists('agentBuilderRoundError');
  }

  /*
   * ==========================
   * Tools: navigation helpers
   * ==========================
   */
  async navigateToToolsLanding() {
    await this.navigateToApp('tools');
  }

  async navigateToNewTool() {
    await this.navigateToApp('tools/new');
  }

  async navigateToTool(toolId: string) {
    await this.navigateToApp(`tools/${toolId}`);
  }

  /*
   * ==========================
   * Tools: form helpers
   * ==========================
   */
  async setToolId(toolId: string) {
    await this.testSubjects.setValue('agentBuilderToolIdInput', toolId);
  }

  async getToolIdValue() {
    return await this.testSubjects.getAttribute('agentBuilderToolIdInput', 'value');
  }

  async selectToolType(type: Exclude<ToolType, ToolType.builtin>) {
    await this.testSubjects.selectValue('agentBuilderToolTypeSelect', type);
  }

  async setToolDescription(description: string) {
    await this.testSubjects.setValue('euiMarkdownEditorTextArea', description);
  }

  async getToolDescriptionValue() {
    return await this.testSubjects.getAttribute('euiMarkdownEditorTextArea', 'value');
  }

  async setIndexPattern(indexPattern: string) {
    await this.testSubjects.setValue('onechatIndexPatternInput', indexPattern);
  }

  async setEsqlQuery(query: string) {
    await this.monacoEditor.setCodeEditorValue(query);
  }

  /*
   * ==========================
   * Tools: actions (save, context menu, delete, test flyout)
   * ==========================
   */

  async saveTool(closeToast: boolean = true) {
    await this.testSubjects.click('toolFormSaveButton');
    if (closeToast) {
      await this.testSubjects.click('toastCloseButton');
    }
  }

  async openToolContextMenu() {
    await this.testSubjects.click('agentBuilderToolContextMenuButton');
  }

  async clickToolCloneButton() {
    await this.testSubjects.click('agentBuilderToolCloneButton');
  }

  async clickToolDeleteButton() {
    await this.testSubjects.click('agentBuilderToolDeleteButton');
  }

  async confirmModalConfirm() {
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  async selectToolRowCheckbox(toolId: string) {
    await this.testSubjects.click(`checkboxSelectRow-${toolId}`);
  }

  async clickToolsSelectAll() {
    await this.testSubjects.click('agentBuilderToolsSelectAllButton');
  }

  async clickToolsBulkDelete() {
    await this.testSubjects.click('agentBuilderToolsBulkDeleteButton');
  }

  async openToolTestFlyout() {
    await this.testSubjects.click('toolFormTestButton');
  }

  async submitToolTest() {
    await this.testSubjects.click('agentBuilderToolTestSubmitButton');
  }

  async waitForToolTestResponseNotEmpty() {
    await this.retry.try(async () => {
      const response = await this.testSubjects.getVisibleText('agentBuilderToolTestResponse');
      if (response.includes('{}')) {
        throw new Error('Tool execution response not ready');
      }
    });
  }

  /*
   * ==========================
   * Tools: table helpers
   * ==========================
   */
  async isToolInTable(toolId: string): Promise<boolean> {
    try {
      await this.testSubjects.find(`agentBuilderToolsTableRow-${toolId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async bulkDeleteTools(ids?: string[]) {
    if (ids && ids.length > 0) {
      for (const id of ids) {
        await this.selectToolRowCheckbox(id);
      }
    } else {
      await this.clickToolsSelectAll();
    }

    await this.clickToolsBulkDelete();
    await this.confirmModalConfirm();
    await this.testSubjects.click('toastCloseButton');
  }
}
