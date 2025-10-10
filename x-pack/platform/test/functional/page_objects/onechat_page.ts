/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ToolType } from '@kbn/onechat-common';
import { subj } from '@kbn/test-subj-selector';
import { last } from 'lodash';
import { AGENT_BUILDER_APP_ID } from '../../onechat/common/constants';
import type { LlmProxy } from '../../onechat_api_integration/utils/llm_proxy';
import {
  setupAgentCallSearchToolWithNoIndexSelectedThenAnswer,
  setupAgentDirectAnswer,
} from '../../onechat_api_integration/utils/proxy_scenario';
import type { FtrProviderContext } from '../ftr_provider_context';
import { FtrService } from '../ftr_provider_context';

export class OneChatPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
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

  /*
   * ==========================
   * Agents: creation
   * ==========================
   */
  async createAgentViaUI({ id, name, labels }: { id: string; name: string; labels: string[] }) {
    await this.navigateToApp('agents/new');
    const selectors = {
      inputs: {
        id: 'agentSettingsIdInput',
        displayName: 'agentSettingsDisplayNameInput',
        description: 'agentSettingsDescriptionInput',
        labels: 'comboBoxSearchInput',
      },
      saveButton: 'agentFormSaveButton',
      labelsComboBox: 'agentSettingsLabelsComboBox',
    };
    await this.testSubjects.append(selectors.inputs.id, id);
    await this.testSubjects.append(selectors.inputs.displayName, name);
    await this.testSubjects.append(selectors.inputs.description, `Agent for testing ${id}`);
    const labelsComboBox = await this.testSubjects.find(selectors.labelsComboBox);
    const labelsInput = await this.testSubjects.findDescendant(
      selectors.inputs.labels,
      labelsComboBox
    );
    for (const label of labels) {
      await labelsInput.click();
      await labelsInput.type(label);
      await labelsInput.pressKeys(this.browser.keys.ENTER);
    }
    await this.testSubjects.click(selectors.saveButton);
  }

  /*
   * ==========================
   * Agents: list page
   * ==========================
   */
  agentsListSearch() {
    const contentSelector = subj('agentBuilderAgentsListContent');
    const searchSelector = `${contentSelector} .euiFieldSearch`;
    const clearButtonSelector = `${contentSelector} ${subj('clearSearchButton')}`;
    const findSearch = () => this.find.byCssSelector(searchSelector);
    return {
      type: async (term: string) => {
        const search = await findSearch();
        await search.click();
        await search.type(term);
      },
      clear: async () => {
        await this.find.clickByCssSelector(clearButtonSelector);
        const search = await findSearch();
        expect(await search.getAttribute('value')).to.be('');
      },
    };
  }

  async selectAgentLabel(label: string) {
    const contentSelector = subj('agentBuilderAgentsListContent');
    const labelsButtonSelector = `${contentSelector} button[type="button"][aria-label="Labels Selection"]`;
    const optionSelector = `ul[role="listbox"][aria-label="Labels"] > li[role="option"][title="${label}"]`;

    const labelsButton = await this.find.byCssSelector(labelsButtonSelector);
    await labelsButton.click();
    await this.find.clickByCssSelector(optionSelector);
  }

  async countAgentsListRows() {
    const rows = await this.testSubjects.findAll('^agentBuilderAgentsListRow');
    return rows.length;
  }

  agentInList(agentId: string) {
    const rowSelector = `agentBuilderAgentsListRow-${agentId}`;
    const openActions = async () => {
      const row = await this.testSubjects.find(rowSelector);
      const actionsMenuButton = await this.testSubjects.findDescendant(
        'euiCollapsedItemActionsButton',
        row
      );
      await actionsMenuButton.click();
    };
    return {
      existOrFail: () => this.testSubjects.existOrFail(rowSelector),
      missingOrFail: () => this.testSubjects.missingOrFail(rowSelector),
      action: (actionSubj: string) => {
        const actionSelector = `.euiBasicTable__collapsedActions ${subj(actionSubj)}`;
        return {
          click: async () => {
            await openActions();
            await this.find.clickByCssSelector(actionSelector);
          },
          getHref: async () => {
            await openActions();
            const action = await this.find.byCssSelector(actionSelector);
            return action.getAttribute('href');
          },
        };
      },
    };
  }

  async clickAgentChat(agentId: string) {
    await this.agentInList(agentId).action(`agentBuilderAgentsListChat-${agentId}`).click();
  }

  async hasAgentEditLink(agentId: string) {
    const href = await this.agentInList(agentId)
      .action(`agentBuilderAgentsListEdit-${agentId}`)
      .getHref();
    if (!href) {
      return false;
    }
    return href.includes(`/agents/${agentId}`);
  }

  async hasAgentCloneLink(agentId: string) {
    const href = await this.agentInList(agentId)
      .action(`agentBuilderAgentsListClone-${agentId}`)
      .getHref();
    if (!href) {
      return false;
    }
    return href.includes(`/agents/new?source_id=${agentId}`);
  }

  async openAgentDeleteModal(agentId: string) {
    await this.agentInList(agentId).action(`agentBuilderAgentsListDelete-${agentId}`).click();
    const deleteModalSelector =
      '.euiModal[role="alertdialog"][aria-labelledby^="agentDeleteModalTitle"]';
    const modal = await this.find.byCssSelector(deleteModalSelector);
    return {
      getTitle: async () => {
        const titleSelector = '[id^="agentDeleteModalTitle"]';
        const titleElement = await this.find.descendantDisplayedByCssSelector(titleSelector, modal);
        return titleElement.getVisibleText();
      },
      clickConfirm: async () => {
        const confirmButton = await this.testSubjects.findDescendant(
          'onechatAgentDeleteConfirmButton',
          modal
        );
        await confirmButton.click();
      },
    };
  }
}
