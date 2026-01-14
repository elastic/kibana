/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/agent-builder-common';
import { subj } from '@kbn/test-subj-selector';
import { AGENT_BUILDER_APP_ID } from '../../agent_builder/common/constants';
import type { LlmProxy } from '../../agent_builder_api_integration/utils/llm_proxy';
import {
  setupAgentCallSearchToolWithNoIndexSelectedThenAnswer,
  setupAgentDirectAnswer,
} from '../../agent_builder_api_integration/utils/proxy_scenario';
import type { FtrProviderContext } from '../ftr_provider_context';
import { FtrService } from '../ftr_provider_context';

export class AgentBuilderPageObject extends FtrService {
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
   * Navigate to the AgentBuilder app
   */
  async navigateToApp(path: string = 'conversations/new') {
    await this.common.navigateToApp(AGENT_BUILDER_APP_ID, { path });
  }

  /**
   * Type a message in the conversation input
   */
  async typeMessage(message: string) {
    const inputElement = await this.testSubjects.find('agentBuilderConversationInputEditor');
    await inputElement.click();
    await inputElement.type(message);
  }

  /**
   * Send the current message
   */
  async sendMessage() {
    const sendButton = await this.testSubjects.find('agentBuilderConversationInputSubmitButton');
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

  async openConversationsHistory() {
    // Only open if not already open
    if (await this.isConversationsHistoryOpen()) {
      return;
    }

    const conversationsHistoryToggleBtn = await this.testSubjects.find(
      'agentBuilderConversationsHistoryToggleBtn'
    );
    await conversationsHistoryToggleBtn.click();

    // Wait for the conversations history popover to be visible and populated
    await this.retry.try(async () => {
      const conversationList = await this.testSubjects.find('agentBuilderConversationList');
      // Verify the list is actually visible and has content
      const isDisplayed = await conversationList.isDisplayed();
      if (!isDisplayed) {
        throw new Error('Conversation list is not displayed');
      }
    });
  }

  /**
   * Check if the conversations history popover is currently open
   */
  async isConversationsHistoryOpen(): Promise<boolean> {
    try {
      const conversationList = await this.testSubjects.find('agentBuilderConversationList');
      return await conversationList.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Navigate to an existing conversation by clicking on it in the history sidebar
   */
  async navigateToConversationViaHistory(conversationId: string) {
    await this.openConversationsHistory();

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
   * Delete a conversation by clicking the more actions button and then the delete button
   */
  async deleteConversation(conversationId: string) {
    await this.openConversationsHistory();

    // Click on conversation to open it
    const conversationItem = await this.testSubjects.find(`conversationItem-${conversationId}`);
    await conversationItem.click();

    // Click on the more actions button
    const moreActionsButton = await this.testSubjects.find('agentBuilderMoreActionsButton');
    await moreActionsButton.click();

    // Click on the delete button from the popover
    const deleteButton = await this.testSubjects.find('agentBuilderConversationDeleteButton');
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
    await this.openConversationsHistory();

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
   * Get the current conversation title text
   */
  async getConversationTitle(): Promise<string> {
    const titleElement = await this.testSubjects.find('agentBuilderConversationTitle');
    return await titleElement.getVisibleText();
  }

  /**
   * Rename a conversation by hovering over the title, clicking the pencil icon,
   * entering the new name, and submitting
   */
  async renameConversation(newTitle: string): Promise<string> {
    // Hover over the conversation title to reveal the pencil icon
    const titleElement = await this.testSubjects.find('agentBuilderConversationTitle');
    await titleElement.moveMouseTo();

    // Click the pencil icon to enter edit mode
    const renameButton = await this.testSubjects.find('agentBuilderConversationRenameButton');
    await renameButton.click();

    // Wait for the inline edit input to appear and clear + type new name
    const inputElement = await this.testSubjects.find('renameConversationInputField');
    await inputElement.clearValueWithKeyboard();
    await inputElement.type(newTitle);

    // Click the save button (checkmark icon)
    const saveButton = await this.testSubjects.find('renameConversationSaveButton');
    await saveButton.click();

    // Wait for the title to update
    await this.retry.try(async () => {
      const updatedTitle = await this.getConversationTitle();
      if (updatedTitle !== newTitle) {
        throw new Error(`Title not yet updated: expected "${newTitle}", got "${updatedTitle}"`);
      }
    });

    return newTitle;
  }

  /**
   * Get the thinking details text
   */
  async getThinkingDetails() {
    const responseElement = await this.testSubjects.find('agentBuilderThinkingPanel');
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
    // EuiSuperSelect requires clicking the button to open the dropdown, then clicking the option
    await this.testSubjects.click('agentBuilderToolTypeSelect');
    await this.testSubjects.click(`agentBuilderToolTypeOption-${type}`);
  }

  async setToolDescription(description: string) {
    await this.testSubjects.setValue('euiMarkdownEditorTextArea', description);
  }

  async getToolDescriptionValue() {
    return await this.testSubjects.getAttribute('euiMarkdownEditorTextArea', 'value');
  }

  async setIndexPattern(indexPattern: string) {
    await this.testSubjects.setValue('agentBuilderIndexPatternInput', indexPattern);
  }

  async setEsqlQuery(query: string) {
    await this.monacoEditor.setCodeEditorValue(query);
  }

  async selectMcpConnector(connectorId: string) {
    await this.testSubjects.click('agentBuilderMcpConnectorSelect');
    await this.retry.try(async () => {
      await this.testSubjects.click(`mcpConnectorOption-${connectorId}`);
    });
  }

  async selectMcpTool(toolName: string) {
    await this.testSubjects.click('agentBuilderMcpToolSelect');
    await this.retry.try(async () => {
      await this.testSubjects.click(`mcpToolOption-${toolName}`);
    });
  }

  async waitForMcpToolsToLoad() {
    // Wait for the MCP tool selector to be enabled (not loading)
    await this.retry.try(async () => {
      const comboBox = await this.testSubjects.find('agentBuilderMcpToolSelect');
      const isDisabled = await comboBox.getAttribute('disabled');
      if (isDisabled === 'true') {
        throw new Error('MCP tools still loading');
      }
    });
  }

  /*
   * ==========================
   * Tools: bulk import MCP helpers
   * ==========================
   */
  async navigateToBulkImportMcp() {
    await this.navigateToApp('tools/bulk_import_mcp');
  }

  async openManageMcpMenu() {
    await this.testSubjects.click('agentBuilderManageMcpButton');
  }

  async clickBulkImportMcpMenuItem() {
    await this.testSubjects.existOrFail('agentBuilderBulkImportMcpMenuItem');
    await this.testSubjects.click('agentBuilderBulkImportMcpMenuItem');
  }

  async selectBulkImportConnector(connectorId: string) {
    await this.testSubjects.click('bulkImportMcpConnectorSelect');
    await this.retry.try(async () => {
      await this.testSubjects.click(`bulkImportMcpConnectorOption-${connectorId}`);
    });
  }

  async waitForBulkImportToolsToLoad() {
    await this.retry.try(async () => {
      const table = await this.testSubjects.find('bulkImportMcpToolsTable');
      const isLoading = await table.getAttribute('data-is-loading');
      if (isLoading === 'true') {
        throw new Error('Bulk import tools still loading');
      }
    });
  }

  async selectBulkImportToolCheckbox(toolName: string) {
    // EuiInMemoryTable uses itemId="name", so checkbox is checkboxSelectRow-{toolName}
    await this.testSubjects.click(`checkboxSelectRow-${toolName}`);
  }

  async setBulkImportNamespace(namespace: string) {
    await this.testSubjects.setValue('bulkImportMcpToolsNamespaceInput', namespace);
  }

  async clickBulkImportSubmit() {
    await this.testSubjects.click('bulkImportMcpToolsImportButton');
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

  async setToolTestInput(paramName: string, value: string | number) {
    await this.testSubjects.setValue(`agentBuilderToolTestInput-${paramName}`, String(value));
  }

  async getToolTestResponse(): Promise<string> {
    return await this.testSubjects.getVisibleText('agentBuilderToolTestResponse');
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

  toolsSearch() {
    return {
      type: async (term: string) => {
        await this.testSubjects.setValue('agentBuilderToolsSearchInput', term);
      },
    };
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
      },
      getValue: async () => {
        const search = await findSearch();
        const value = await search.getAttribute('value');
        return value;
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

  private agentListRowSelector(agentId: string) {
    return `agentBuilderAgentsListRow-${agentId}`;
  }

  async agentExistsOrFail(agentId: string) {
    await this.testSubjects.existOrFail(this.agentListRowSelector(agentId));
  }

  async agentMissingOrFail(agentId: string) {
    await this.testSubjects.missingOrFail(this.agentListRowSelector(agentId));
  }

  agentAction(agentId: string, actionSubj: string) {
    const rowSelector = this.agentListRowSelector(agentId);
    const actionSelector = `.euiBasicTable__collapsedActions ${subj(actionSubj)}`;
    const openActionsButtonSelector = `${rowSelector} > euiCollapsedItemActionsButton`;
    return {
      click: async () => {
        await this.testSubjects.click(openActionsButtonSelector);
        await this.find.clickByCssSelector(actionSelector);
      },
      getHref: async () => {
        await this.testSubjects.click(openActionsButtonSelector);
        const action = await this.find.byCssSelector(actionSelector);
        return action.getAttribute('href');
      },
    };
  }

  async getAgentRowDisplayName(agentId: string) {
    const rowSelector = this.agentListRowSelector(agentId);
    const nameAndDescriptionCellSelector = 'agentBuilderAgentsListNameAndDescription';
    const displayNameSelector = `${rowSelector} > ${nameAndDescriptionCellSelector} > agentBuilderAgentsListName`;
    const agentDisplayName = await this.testSubjects.getVisibleText(displayNameSelector);
    return agentDisplayName;
  }

  async getAgentLabels(agentId: string) {
    const rowSelector = this.agentListRowSelector(agentId);
    const labelsTableCellSelector = 'agentBuilderAgentsListLabels';
    const labelSelector = '^agentBuilderLabel-';
    const visibleLabelsSelector = `${rowSelector} > ${labelsTableCellSelector} > ${labelSelector}`;
    const viewMoreButtonSelector = `${rowSelector} > ${labelsTableCellSelector} > agentBuilderLabelsViewMoreButton`;

    const labelTexts = await this.testSubjects.getVisibleTextAll(visibleLabelsSelector);
    const hasViewMoreButton = await this.testSubjects.exists(viewMoreButtonSelector);

    if (hasViewMoreButton) {
      const popoverSelector = 'agentBuilderLabelsViewMorePopover';
      const hiddenLabelsSelector = `${popoverSelector} > ${labelSelector}`;

      await this.testSubjects.click(viewMoreButtonSelector);
      const hiddenLabelTexts = await this.testSubjects.getVisibleTextAll(hiddenLabelsSelector);
      labelTexts.push(...hiddenLabelTexts);

      // Close popover
      await this.testSubjects.click(viewMoreButtonSelector);
    }

    return labelTexts;
  }

  async clickAgentChat(agentId: string) {
    const chatActionSelector = `agentBuilderAgentsListChat-${agentId}`;
    await this.agentAction(agentId, chatActionSelector).click();
  }

  async clickAgentEdit(agentId: string) {
    const editActionSelector = `agentBuilderAgentsListEdit-${agentId}`;
    await this.agentAction(agentId, editActionSelector).click();
  }

  async hasAgentEditLink(agentId: string) {
    const editActionSelector = `agentBuilderAgentsListEdit-${agentId}`;
    const href = await this.agentAction(agentId, editActionSelector).getHref();
    if (!href) {
      return false;
    }
    return href.includes(`/agents/${agentId}`);
  }

  async clickAgentClone(agentId: string) {
    const cloneActionSelector = `agentBuilderAgentsListClone-${agentId}`;
    await this.agentAction(agentId, cloneActionSelector).click();
  }

  async hasAgentCloneLink(agentId: string) {
    const cloneActionSelector = `agentBuilderAgentsListClone-${agentId}`;
    const href = await this.agentAction(agentId, cloneActionSelector).getHref();
    if (!href) {
      return false;
    }
    return href.includes(`/agents/new?source_id=${agentId}`);
  }

  async openAgentDeleteModal(agentId: string) {
    const deleteActionSelector = `agentBuilderAgentsListDelete-${agentId}`;
    const deleteModalSelector =
      '.euiModal[role="alertdialog"][aria-labelledby^="agentDeleteModalTitle"]';

    await this.agentAction(agentId, deleteActionSelector).click();
    const modal = await this.find.byCssSelector(deleteModalSelector);

    return {
      getTitle: async () => {
        const titleSelector = '[id^="agentDeleteModalTitle"]';
        const titleElement = await this.find.descendantDisplayedByCssSelector(titleSelector, modal);
        return titleElement.getVisibleText();
      },
      clickConfirm: async () => {
        const confirmButtonSelector = 'agentBuilderAgentDeleteConfirmButton';
        const confirmButton = await this.testSubjects.findDescendant(confirmButtonSelector, modal);
        await confirmButton.click();
      },
    };
  }

  /*
   * ==========================
   * Agents: form
   * ==========================
   */
  async getAgentFormPageTitle() {
    const pageTitle = await this.testSubjects.getVisibleText('agentFormPageTitle');
    return pageTitle;
  }

  getAgentIdInput() {
    const idInputSelector = 'agentSettingsIdInput';
    return {
      getValue: async () => {
        const idInputValue = await this.testSubjects.getAttribute(idInputSelector, 'value');
        return idInputValue;
      },
      isEnabled: async () => {
        const isIdInputEnabled = await this.testSubjects.isEnabled(idInputSelector);
        return isIdInputEnabled;
      },
    };
  }

  async getAgentFormDisplayName() {
    const displayNameInputValue = await this.testSubjects.getAttribute(
      'agentSettingsDisplayNameInput',
      'value'
    );
    return displayNameInputValue;
  }

  async setAgentFormDisplayName(name: string) {
    await this.testSubjects.setValue('agentSettingsDisplayNameInput', name);
  }

  agentFormSaveButton() {
    const saveButtonSelector = 'agentFormSaveButton';
    return {
      isEnabled: async () => {
        const isSaveButtonEnabled = await this.testSubjects.isEnabled(saveButtonSelector);
        return isSaveButtonEnabled;
      },
      click: async () => {
        await this.testSubjects.click(saveButtonSelector);
      },
    };
  }
}
