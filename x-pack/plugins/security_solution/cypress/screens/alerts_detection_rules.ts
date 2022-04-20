/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BULK_ACTIONS_BTN = '[data-test-subj="bulkActions"] span';

export const CREATE_NEW_RULE_BTN = '[data-test-subj="create-new-rule"]';

export const COLLAPSED_ACTION_BTN = '[data-test-subj="euiCollapsedItemActionsButton"]';

export const CUSTOM_RULES_BTN = '[data-test-subj="showCustomRulesFilterButton"]';

export const DELETE_RULE_ACTION_BTN = '[data-test-subj="deleteRuleAction"]';

export const EDIT_RULE_ACTION_BTN = '[data-test-subj="editRuleAction"]';

export const DUPLICATE_RULE_ACTION_BTN = '[data-test-subj="duplicateRuleAction"]';

export const DUPLICATE_RULE_MENU_PANEL_BTN = '[data-test-subj="rules-details-duplicate-rule"]';

export const ACTIVATE_RULE_BULK_BTN = '[data-test-subj="activateRuleBulk"]';

export const DEACTIVATE_RULE_BULK_BTN = '[data-test-subj="deactivateRuleBulk"]';

export const DELETE_RULE_BULK_BTN = '[data-test-subj="deleteRuleBulk"]';

export const DUPLICATE_RULE_BULK_BTN = '[data-test-subj="duplicateRuleBulk"]';

export const ELASTIC_RULES_BTN = '[data-test-subj="showElasticRulesFilterButton"]';

export const EXPORT_ACTION_BTN = '[data-test-subj="exportRuleAction"]';

export const FIRST_RULE = 0;

export const FOURTH_RULE = 3;

export const LOAD_PREBUILT_RULES_BTN = '[data-test-subj="load-prebuilt-rules"]';

export const RULES_TABLE_INITIAL_LOADING_INDICATOR =
  '[data-test-subj="initialLoadingPanelAllRulesTable"]';

export const RULES_TABLE_REFRESH_INDICATOR = '[data-test-subj="loading-spinner"]';

export const RULES_TABLE_AUTOREFRESH_INDICATOR = '[data-test-subj="loadingRulesInfoProgress"]';

export const RISK_SCORE = '[data-test-subj="riskScore"]';

export const RELOAD_PREBUILT_RULES_BTN = '[data-test-subj="reloadPrebuiltRulesBtn"]';

export const SECOND_RULE = 1;

export const RULE_CHECKBOX = '.euiTableRow .euiCheckbox__input';

export const RULE_NAME = '[data-test-subj="ruleName"]';

export const RULE_SWITCH = '[data-test-subj="ruleSwitch"]';

export const RULE_SWITCH_LOADER = '[data-test-subj="ruleSwitchLoader"]';

export const RULES_TABLE = '[data-test-subj="rules-table"]';

export const RULES_ROW = '.euiTableRow';

export const RULES_MONIROTING_TABLE = '[data-test-subj="allRulesTableTab-monitoring"]';

export const SEVERITY = '[data-test-subj="severity"]';

export const SHOWING_RULES_TEXT = '[data-test-subj="showingRules"]';

export const SORT_RULES_BTN = '[data-test-subj="tableHeaderSortButton"]';

export const RULE_AUTO_REFRESH_IDLE_MODAL = '[data-test-subj="allRulesIdleModal"]';

export const RULE_AUTO_REFRESH_IDLE_MODAL_CONTINUE = '[data-test-subj="allRulesIdleModal"] button';

export const PAGINATION_POPOVER_BTN = '[data-test-subj="tablePaginationPopoverButton"]';

export const rowsPerPageSelector = (count: number) =>
  `[data-test-subj="tablePagination-${count}-rows"]`;

export const pageSelector = (pageNumber: number) =>
  `[data-test-subj="pagination-button-${pageNumber - 1}"]`;

export const SELECT_ALL_RULES_BTN = '[data-test-subj="selectAllRules"]';

export const RULES_EMPTY_PROMPT = '[data-test-subj="rulesEmptyPrompt"]';

export const RULES_DELETE_CONFIRMATION_MODAL = '[data-test-subj="allRulesDeleteConfirmationModal"]';

export const MODAL_CONFIRMATION_BTN = '[data-test-subj="confirmModalConfirmButton"]';

export const RULE_DETAILS_DELETE_BTN = '[data-test-subj="rules-details-delete-rule"]';

export const ALERT_DETAILS_CELLS = '[data-test-subj="dataGridRowCell"]';

export const ALERT_DETAILS_PROCESS_NAME_COLUMN =
  '[data-test-subj="dataGridHeaderCell-process.name"]';

export const ALERT_DETAILS_RULE = '[data-test-subj="formatted-field-signal.rule.name"]';

export const ALERT_DETAILS_SEVERITY = '[data-test-subj="formatted-field-signal.rule.severity"]';

export const ALERT_DETAILS_RISK_SCORE = '[data-test-subj="formatted-field-signal.rule.risk_score"]';

export const ALERT_DETAILS_HOST_NAME = '[data-test-subj="formatted-field-host.name"]';

export const ALERT_DETAILS_USER_NAME = '[data-test-subj="formatted-field-user.name"]';

export const ALERT_DETAILS_PROCESS_NAME = '[data-test-subj="formatted-field-process.name"]';

export const ALERT_DETAILS_FILE_NAME = '[data-test-subj="formatted-field-file.name"]';

export const ALERT_DETAILS_SOURCE_IP = '[data-test-subj="formatted-field-source.ip"]';

export const ALERT_DETAILS_DESTINATION_IP = '[data-test-subj="formatted-field-destination.ip"]';

export const SERVER_SIDE_EVENT_COUNT = '[data-test-subj="server-side-event-count"]';
