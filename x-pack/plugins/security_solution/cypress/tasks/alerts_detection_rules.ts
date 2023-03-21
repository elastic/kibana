/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duplicatedRuleName } from '../objects/rule';
import {
  BULK_ACTIONS_BTN,
  COLLAPSED_ACTION_BTN,
  CUSTOM_RULES_BTN,
  DELETE_RULE_ACTION_BTN,
  DELETE_RULE_BULK_BTN,
  RULES_SELECTED_TAG,
  LOAD_PREBUILT_RULES_BTN,
  LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN,
  RULES_TABLE_INITIAL_LOADING_INDICATOR,
  RULES_TABLE_AUTOREFRESH_INDICATOR,
  RULE_CHECKBOX,
  RULE_NAME,
  RULE_SWITCH,
  RULE_SWITCH_LOADER,
  RULES_MANAGEMENT_TABLE,
  EXPORT_ACTION_BTN,
  EDIT_RULE_ACTION_BTN,
  DUPLICATE_RULE_ACTION_BTN,
  DUPLICATE_RULE_MENU_PANEL_BTN,
  DUPLICATE_RULE_BULK_BTN,
  CONFIRM_DUPLICATE_RULE,
  RULES_ROW,
  SELECT_ALL_RULES_BTN,
  MODAL_CONFIRMATION_BTN,
  RULES_DELETE_CONFIRMATION_MODAL,
  ENABLE_RULE_BULK_BTN,
  DISABLE_RULE_BULK_BTN,
  RULE_DETAILS_DELETE_BTN,
  RULE_IMPORT_MODAL_BUTTON,
  RULE_IMPORT_MODAL,
  INPUT_FILE,
  RULE_IMPORT_OVERWRITE_CHECKBOX,
  RULE_IMPORT_OVERWRITE_EXCEPTIONS_CHECKBOX,
  RULES_TAGS_POPOVER_BTN,
  RULES_TAGS_POPOVER_WRAPPER,
  INTEGRATIONS_POPOVER,
  SELECTED_RULES_NUMBER_LABEL,
  REFRESH_SETTINGS_POPOVER,
  REFRESH_SETTINGS_SWITCH,
  ELASTIC_RULES_BTN,
  BULK_EXPORT_ACTION_BTN,
  TOASTER_ERROR_BTN,
  MODAL_CONFIRMATION_CANCEL_BTN,
  MODAL_CONFIRMATION_BODY,
  RULE_SEARCH_FIELD,
  RULE_IMPORT_OVERWRITE_CONNECTORS_CHECKBOX,
  RULES_TAGS_FILTER_BTN,
  RULES_TAGS_FILTER_POPOVER,
  RULES_TABLE_REFRESH_INDICATOR,
  RULES_MANAGEMENT_TAB,
  RULES_MONITORING_TAB,
  ENABLED_RULES_BTN,
  DISABLED_RULES_BTN,
  REFRESH_RULES_TABLE_BUTTON,
  RULE_LAST_RUN,
} from '../screens/alerts_detection_rules';
import type { RULES_MONITORING_TABLE } from '../screens/alerts_detection_rules';
import { EUI_CHECKBOX } from '../screens/common/controls';
import { ALL_ACTIONS } from '../screens/rule_details';
import { EDIT_SUBMIT_BUTTON } from '../screens/edit_rule';
import { LOADING_INDICATOR } from '../screens/security_header';
import { waitTillPrebuiltRulesReadyToInstall } from './api_calls/prebuilt_rules';

import { goToRuleEditSettings } from './rule_details';
import { goToActionsStepTab } from './create_new_rule';

export const enableRule = (rulePosition: number) => {
  cy.get(RULE_SWITCH).eq(rulePosition).click({ force: true });
};

export const editFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).should('be.visible');
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(EDIT_RULE_ACTION_BTN).should('be.visible');
  cy.get(EDIT_RULE_ACTION_BTN).click();
};

export const duplicateFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).should('be.visible');
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(DUPLICATE_RULE_ACTION_BTN).should('be.visible');
  cy.get(DUPLICATE_RULE_ACTION_BTN).click();
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

/**
 * Duplicates the rule from the menu and does additional
 * pipes and checking that the elements are present on the
 * page as well as removed when doing the clicks to help reduce
 * flake.
 */
export const duplicateRuleFromMenu = () => {
  const click = ($el: Cypress.ObjectLike) => cy.wrap($el).click({ force: true });
  cy.get(LOADING_INDICATOR).should('not.exist');
  cy.get(ALL_ACTIONS).pipe(click);
  cy.get(DUPLICATE_RULE_MENU_PANEL_BTN).should('be.visible');

  // Because of a fade effect and fast clicking this can produce more than one click
  cy.get(DUPLICATE_RULE_MENU_PANEL_BTN).pipe(click);
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

/**
 * Check that the duplicated rule is on the table
 * and it is disabled (default)
 */
export const checkDuplicatedRule = () => {
  cy.contains(RULE_NAME, duplicatedRuleName)
    .parents(RULES_ROW)
    .find(RULE_SWITCH)
    .should('have.attr', 'aria-checked', 'false');
};

export const deleteFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(DELETE_RULE_ACTION_BTN).click();
};

export const deleteSelectedRules = () => {
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(DELETE_RULE_BULK_BTN).click();
};

export const deleteRuleFromDetailsPage = () => {
  cy.get(ALL_ACTIONS).should('be.visible');
  // We cannot use cy.root().pipe($el) withing this function and instead have to use a cy.wait()
  // for the click handler to be registered. If you see flake here because of click handler issues
  // increase the cy.wait(). The reason we cannot use cypress pipe is because multiple clicks on ALL_ACTIONS
  // causes the pop up to show and then the next click for it to hide. Multiple clicks can cause
  // the DOM to queue up and once we detect that the element is visible it can then become invisible later
  cy.wait(1000);
  cy.get(ALL_ACTIONS).click();
  cy.get(RULE_DETAILS_DELETE_BTN).should('be.visible');
  cy.get(RULE_DETAILS_DELETE_BTN)
    .pipe(($el) => $el.trigger('click'))
    .should(($el) => expect($el).to.be.not.visible);
};

export const duplicateSelectedRules = () => {
  cy.log('Duplicate selected rules');
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(DUPLICATE_RULE_BULK_BTN).click();
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

export const enableSelectedRules = () => {
  cy.log('Enable selected rules');
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(ENABLE_RULE_BULK_BTN).click();
};

export const disableSelectedRules = () => {
  cy.log('Disable selected rules');
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(DISABLE_RULE_BULK_BTN).click();
};

export const exportRule = (name: string) => {
  cy.log(`Export rule "${name}"`);

  cy.contains(RULE_NAME, name).parents(RULES_ROW).find(COLLAPSED_ACTION_BTN).click();
  cy.get(EXPORT_ACTION_BTN).click();
  cy.get(EXPORT_ACTION_BTN).should('not.exist');
};

export const filterBySearchTerm = (term: string) => {
  cy.log(`Filter rules by search term: "${term}"`);
  cy.get(RULE_SEARCH_FIELD)
    .type(term, { force: true })
    .trigger('search', { waitForAnimations: true });
};

export const filterByTags = (tags: string[]) => {
  cy.get(RULES_TAGS_FILTER_BTN).click();

  for (const tag of tags) {
    cy.get(RULES_TAGS_FILTER_POPOVER).contains(tag).click();
  }
};

export const waitForRuleExecution = (name: string) => {
  cy.log(`Wait for rule "${name}" to be executed`);
  cy.waitUntil(() => {
    cy.get(REFRESH_RULES_TABLE_BUTTON).click();

    return cy
      .contains(RULE_NAME, name)
      .parents(RULES_ROW)
      .find(RULE_LAST_RUN)
      .then(($el) => $el.text().endsWith('ago'));
  });
};

export const filterByElasticRules = () => {
  cy.get(ELASTIC_RULES_BTN).click();
  waitForRulesTableToBeRefreshed();
};

export const filterByCustomRules = () => {
  cy.get(CUSTOM_RULES_BTN).click({ force: true });
};

export const filterByEnabledRules = () => {
  cy.get(ENABLED_RULES_BTN).click({ force: true });
};

export const filterByDisabledRules = () => {
  cy.get(DISABLED_RULES_BTN).click({ force: true });
};

export const goToRuleDetails = () => {
  cy.get(RULE_NAME).first().click({ force: true });
};

export const goToTheRuleDetailsOf = (ruleName: string) => {
  cy.contains(RULE_NAME, ruleName).click({ force: true });
};

export const loadPrebuiltDetectionRules = () => {
  cy.log('load prebuilt detection rules');
  waitTillPrebuiltRulesReadyToInstall();
  cy.get(LOAD_PREBUILT_RULES_BTN, { timeout: 300000 })
    .should('be.enabled')
    .pipe(($el) => $el.trigger('click'))
    .should('be.disabled');
};

/**
 * load prebuilt rules by clicking button on page header
 */
export const loadPrebuiltDetectionRulesFromHeaderBtn = () => {
  cy.log('load prebuilt detection rules from header');
  waitTillPrebuiltRulesReadyToInstall();
  cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN, { timeout: 300000 }).click().should('not.exist');
};

export const openIntegrationsPopover = () => {
  cy.get(INTEGRATIONS_POPOVER).click();
};

export const reloadDeletedRules = () => {
  cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).click({ force: true });
};

/**
 * Selects the number of rules. Since there can be missing click handlers
 * when the page loads at first, we use a pipe and a trigger of click
 * on it and then check to ensure that it is checked before continuing
 * with the tests.
 * @param numberOfRules The number of rules to click/check
 */
export const selectNumberOfRules = (numberOfRules: number) => {
  for (let i = 0; i < numberOfRules; i++) {
    cy.get(RULE_CHECKBOX)
      .eq(i)
      .pipe(($el) => $el.trigger('click'))
      .should('be.checked');
  }
};

export const unselectRuleByName = (ruleName: string) => {
  cy.contains(RULE_NAME, ruleName)
    .parents(RULES_ROW)
    .find(EUI_CHECKBOX)
    .click()
    .should('not.be.checked');
};

/**
 * Unselects a passed number of rules. To use together with selectNumberOfRules
 * as this utility will expect and check the passed number of rules
 * to have been previously checked.
 * @param numberOfRules The number of rules to click/check
 */
export const unselectNumberOfRules = (numberOfRules: number) => {
  for (let i = 0; i < numberOfRules; i++) {
    cy.get(RULE_CHECKBOX)
      .eq(i)
      .should('be.checked')
      .pipe(($el) => $el.trigger('click'))
      .should('not.be.checked');
  }
};

export const selectAllRules = () => {
  cy.log('Select all rules');
  cy.get(SELECT_ALL_RULES_BTN).contains('Select all').click();
  cy.get(SELECT_ALL_RULES_BTN).contains('Clear');
};

export const clearAllRuleSelection = () => {
  cy.log('Clear all rules selection');
  cy.get(SELECT_ALL_RULES_BTN).contains('Clear').click();
  cy.get(SELECT_ALL_RULES_BTN).contains('Select all');
};

export const confirmRulesDelete = () => {
  cy.get(RULES_DELETE_CONFIRMATION_MODAL).should('be.visible');
  cy.get(MODAL_CONFIRMATION_BTN).click();
  cy.get(RULES_DELETE_CONFIRMATION_MODAL).should('not.exist');
};

/**
 * Because the Rule Management page is relatively slow, in order to avoid timeouts and flakiness,
 * we almost always want to wait until the Rules table is "loaded" before we do anything with it.
 *
 * This task should be sufficient for the vast majority of the tests. It waits for the table
 * to show up on the page, but doesn't wait until it is fully loaded and filled with rows.
 *
 * @example
 * beforeEach(() => {
 *   visit(DETECTIONS_RULE_MANAGEMENT_URL); // returns on "load" event, still lots of work to do
 *   waitForRulesTableToShow(); // a lot has done in React and the table shows up on the page
 * });
 */
export const waitForRulesTableToShow = () => {
  // Wait up to 5 minutes for the table to show up as in CI containers this can be very slow
  cy.get(RULES_MANAGEMENT_TABLE, { timeout: 300000 }).should('exist');
};

/**
 * Because the Rule Management page is relatively slow, in order to avoid timeouts and flakiness,
 * we almost always want to wait until the Rules table is "loaded" before we do anything with it.
 *
 * This task can be needed for some tests that e.g. check the table load/refetch/pagination logic.
 * It waits for the table's own loading indicator to show up and disappear.
 *
 * NOTE: Normally, we should not rely on loading indicators in tests, because due to their
 * dynamic nature it's possible to introduce race conditions and flakiness.
 */
export const waitForRulesTableToBeLoaded = () => {
  // Wait up to 5 minutes for the rules to load as in CI containers this can be very slow
  cy.get(RULES_TABLE_INITIAL_LOADING_INDICATOR, { timeout: 300000 }).should('exist');
  cy.get(RULES_TABLE_INITIAL_LOADING_INDICATOR, { timeout: 300000 }).should('not.exist');
};

export const waitForRulesTableToBeRefreshed = () => {
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('exist');
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
};

export const waitForPrebuiltDetectionRulesToBeLoaded = () => {
  cy.log('Wait for prebuilt rules to be loaded');
  cy.get(LOAD_PREBUILT_RULES_BTN, { timeout: 300000 }).should('not.exist');
  cy.get(RULES_MANAGEMENT_TABLE).should('exist');
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
};

/**
 * Wait till the rules on the rules management page get updated, i.e., there are
 * no rules with the loading indicator on the page. Rules display a loading
 * indicator after some actions such as enable, disable, or bulk actions.
 */
export const waitForRuleToUpdate = () => {
  cy.log('Wait for rules to update');
  cy.get(RULE_SWITCH_LOADER, { timeout: 300000 }).should('exist');
  cy.get(RULE_SWITCH_LOADER, { timeout: 300000 }).should('not.exist');
};

export const checkAutoRefresh = (ms: number, condition: string) => {
  cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
  cy.tick(ms);
  cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should(condition);
};

export const importRules = (rulesFile: string) => {
  cy.get(RULE_IMPORT_MODAL).click();
  cy.get(INPUT_FILE).should('exist');
  cy.get(INPUT_FILE).trigger('click', { force: true }).selectFile(rulesFile).trigger('change');
  cy.get(RULE_IMPORT_MODAL_BUTTON).last().click({ force: true });
  cy.get(INPUT_FILE).should('not.exist');
};

export const expectRulesManagementTab = () => {
  cy.log(`Expecting rules management tab to be selected`);
  cy.get(RULES_MANAGEMENT_TAB).should('have.attr', 'aria-selected');
};

export const expectRulesMonitoringTab = () => {
  cy.log(`Expecting rules monitoring tab to be selected`);
  cy.get(RULES_MONITORING_TAB).should('have.attr', 'aria-selected');
};

export const expectFilterSearchTerm = (searchTerm: string) => {
  cy.log(`Expecting rules table filtering by search term '${searchTerm}'`);
  cy.get(RULE_SEARCH_FIELD).should('have.value', searchTerm);
};

export const expectFilterByTags = (tags: string[]) => {
  cy.log(`Expecting rules table filtering by tags [${tags.join(', ')}]`);

  cy.get(RULES_TAGS_FILTER_BTN).contains(`Tags${tags.length}`).click();

  cy.get(RULES_TAGS_FILTER_POPOVER)
    .find(RULES_SELECTED_TAG)
    .should('have.length', tags.length)
    .each(($el, index) => {
      cy.wrap($el).contains(tags[index]);
    });
};

export const expectNoFilterByTags = () => {
  cy.log(`Expecting rules table has no filtering by tags`);
  cy.get(RULES_TAGS_FILTER_BTN).contains('Tags').click();
  cy.get(RULES_TAGS_FILTER_POPOVER).find(RULES_SELECTED_TAG).should('not.exist');
};

export const expectFilterByPrebuiltRules = () => {
  cy.log(`Expecting rules table filtering by prebuilt rules`);
  cy.get(`${ELASTIC_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectFilterByCustomRules = () => {
  cy.log(`Expecting rules table filtering by custom rules`);
  cy.get(`${CUSTOM_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectNoFilterByElasticOrCustomRules = () => {
  cy.log(`Expecting rules table has no filtering by either elastic nor custom rules`);
  cy.get(ELASTIC_RULES_BTN).should('exist');
  cy.get(`${ELASTIC_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
  cy.get(CUSTOM_RULES_BTN).should('exist');
  cy.get(`${CUSTOM_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
};

export const expectFilterByEnabledRules = () => {
  cy.log(`Expecting rules table filtering by enabled rules`);
  cy.get(`${ENABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectFilterByDisabledRules = () => {
  cy.log(`Expecting rules table filtering by disabled rules`);
  cy.get(`${DISABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectNoFilterByEnabledOrDisabledRules = () => {
  cy.log(`Expecting rules table has no filtering by either enabled nor disabled rules`);
  cy.get(ENABLED_RULES_BTN).should('exist');
  cy.get(`${ENABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
  cy.get(DISABLED_RULES_BTN).should('exist');
  cy.get(`${DISABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
};

export const expectNumberOfRules = (
  tableSelector: typeof RULES_MANAGEMENT_TABLE | typeof RULES_MONITORING_TABLE,
  expectedNumber: number
) => {
  cy.log(`Expecting rules table to contain #${expectedNumber} rules`);
  cy.get(tableSelector).find(RULES_ROW).should('have.length', expectedNumber);
};

export const expectToContainRule = (
  tableSelector: typeof RULES_MANAGEMENT_TABLE | typeof RULES_MONITORING_TABLE,
  ruleName: string
) => {
  cy.log(`Expecting rules table to contain '${ruleName}'`);
  cy.get(tableSelector).find(RULES_ROW).should('include.text', ruleName);
};

const selectOverwriteRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_CHECKBOX)
    .pipe(($el) => $el.trigger('click'))
    .should('be.checked');
};

export const expectManagementTableRules = (ruleNames: string[]): void => {
  expectNumberOfRules(RULES_MANAGEMENT_TABLE, ruleNames.length);

  for (const ruleName of ruleNames) {
    expectToContainRule(RULES_MANAGEMENT_TABLE, ruleName);
  }
};

const selectOverwriteExceptionsRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_EXCEPTIONS_CHECKBOX)
    .pipe(($el) => $el.trigger('click'))
    .should('be.checked');
};
const selectOverwriteConnectorsRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_CONNECTORS_CHECKBOX)
    .pipe(($el) => $el.trigger('click'))
    .should('be.checked');
};
export const importRulesWithOverwriteAll = (rulesFile: string) => {
  cy.get(RULE_IMPORT_MODAL).click();
  cy.get(INPUT_FILE).should('exist');
  cy.get(INPUT_FILE).trigger('click', { force: true }).selectFile(rulesFile).trigger('change');
  selectOverwriteRulesImport();
  selectOverwriteExceptionsRulesImport();
  selectOverwriteConnectorsRulesImport();
  cy.get(RULE_IMPORT_MODAL_BUTTON).last().click({ force: true });
  cy.get(INPUT_FILE).should('not.exist');
};

export const testTagsBadge = ($el: JQuery<HTMLElement>, tags: string[]) => {
  // open tags popover
  cy.wrap($el).click();
  cy.get(RULES_TAGS_POPOVER_WRAPPER).should('have.text', tags.join(''));
  // close tags popover
  cy.wrap($el).click();
};

export const testAllTagsBadges = (tags: string[]) => {
  cy.get(RULES_TAGS_POPOVER_BTN).each(($el) => {
    testTagsBadge($el, tags);
  });
};

export const testMultipleSelectedRulesLabel = (rulesCount: number) => {
  cy.get(SELECTED_RULES_NUMBER_LABEL).should('have.text', `Selected ${rulesCount} rules`);
};

export const openRefreshSettingsPopover = () => {
  cy.get(REFRESH_SETTINGS_POPOVER).click();
  cy.get(REFRESH_SETTINGS_SWITCH).should('be.visible');
};

export const checkAutoRefreshIsDisabled = () => {
  cy.get(REFRESH_SETTINGS_SWITCH).should('have.attr', 'aria-checked', 'false');
};

export const checkAutoRefreshIsEnabled = () => {
  cy.get(REFRESH_SETTINGS_SWITCH).should('have.attr', 'aria-checked', 'true');
};

export const disableAutoRefresh = () => {
  cy.get(REFRESH_SETTINGS_SWITCH).click();
  checkAutoRefreshIsDisabled();
};

export const mockGlobalClock = () => {
  /**
   * Ran into the error: timer created with setInterval() but cleared with cancelAnimationFrame()
   * There are no cancelAnimationFrames in the codebase that are used to clear a setInterval so
   * explicitly set the below overrides. see https://docs.cypress.io/api/commands/clock#Function-names
   */

  cy.clock(Date.now(), ['setInterval', 'clearInterval', 'Date']);
};

export const bulkExportRules = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(BULK_EXPORT_ACTION_BTN).click();
};

export const cancelConfirmationModal = () => {
  cy.get(MODAL_CONFIRMATION_CANCEL_BTN).click();
  cy.get(MODAL_CONFIRMATION_BODY).should('not.exist');
};

export const clickErrorToastBtn = () => {
  cy.get(TOASTER_ERROR_BTN).click();
};

export const goToEditRuleActionsSettingsOf = (name: string) => {
  goToTheRuleDetailsOf(name);
  goToRuleEditSettings();
  // wait until first step loads completely. Otherwise cypress stuck at the first edit page
  cy.get(EDIT_SUBMIT_BUTTON).should('be.enabled');
  goToActionsStepTab();
};
