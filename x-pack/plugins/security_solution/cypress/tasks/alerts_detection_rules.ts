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
  CREATE_NEW_RULE_BTN,
  CUSTOM_RULES_BTN,
  DELETE_RULE_ACTION_BTN,
  DELETE_RULE_BULK_BTN,
  LOAD_PREBUILT_RULES_BTN,
  RULES_TABLE_INITIAL_LOADING_INDICATOR,
  RULES_TABLE_REFRESH_INDICATOR,
  RULES_TABLE_AUTOREFRESH_INDICATOR,
  PAGINATION_POPOVER_BTN,
  RELOAD_PREBUILT_RULES_BTN,
  RULE_CHECKBOX,
  RULE_NAME,
  RULE_SWITCH,
  RULE_SWITCH_LOADER,
  RULES_TABLE,
  SORT_RULES_BTN,
  EXPORT_ACTION_BTN,
  EDIT_RULE_ACTION_BTN,
  rowsPerPageSelector,
  pageSelector,
  DUPLICATE_RULE_ACTION_BTN,
  DUPLICATE_RULE_MENU_PANEL_BTN,
  DUPLICATE_RULE_BULK_BTN,
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
} from '../screens/alerts_detection_rules';
import { ALL_ACTIONS } from '../screens/rule_details';
import { LOADING_INDICATOR } from '../screens/security_header';

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
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(DUPLICATE_RULE_BULK_BTN).click();
};

export const enableSelectedRules = () => {
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(ENABLE_RULE_BULK_BTN).click();
};

export const disableSelectedRules = () => {
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(DISABLE_RULE_BULK_BTN).click();
};

export const exportFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(EXPORT_ACTION_BTN).click();
  cy.get(EXPORT_ACTION_BTN).should('not.exist');
};

export const filterByCustomRules = () => {
  cy.get(CUSTOM_RULES_BTN).click({ force: true });
};

export const goToCreateNewRule = () => {
  cy.get(CREATE_NEW_RULE_BTN).click({ force: true });
};

export const goToRuleDetails = () => {
  cy.get(RULE_NAME).first().click({ force: true });
};

export const goToTheRuleDetailsOf = (ruleName: string) => {
  cy.get(RULE_NAME).should('contain', ruleName).contains(ruleName).click();
};

export const loadPrebuiltDetectionRules = () => {
  cy.get(LOAD_PREBUILT_RULES_BTN)
    .should('exist')
    .pipe(($el) => $el.trigger('click'))
    .should('be.disabled');
};

export const reloadDeletedRules = () => {
  cy.get(RELOAD_PREBUILT_RULES_BTN).click({ force: true });
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

export const selectAllRules = () => {
  cy.get(SELECT_ALL_RULES_BTN).contains('Select all').click();
  cy.get(SELECT_ALL_RULES_BTN).contains('Clear');
};

export const confirmRulesDelete = () => {
  cy.get(RULES_DELETE_CONFIRMATION_MODAL).should('be.visible');
  cy.get(MODAL_CONFIRMATION_BTN).click();
  cy.get(RULES_DELETE_CONFIRMATION_MODAL).should('not.exist');
};

export const sortByEnabledRules = () => {
  cy.get(SORT_RULES_BTN).contains('Enabled').click({ force: true });
  cy.get(SORT_RULES_BTN).contains('Enabled').click({ force: true });
};

export const waitForRulesTableToBeLoaded = () => {
  cy.get(RULES_TABLE_INITIAL_LOADING_INDICATOR).should('exist');
  // Wait up to 5 minutes for the rules to load as in CI containers this can be very slow
  cy.get(RULES_TABLE_INITIAL_LOADING_INDICATOR, { timeout: 300000 }).should('not.exist');
};

export const waitForRulesTableToBeRefreshed = () => {
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('exist');
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
};

export const waitForPrebuiltDetectionRulesToBeLoaded = () => {
  cy.get(LOAD_PREBUILT_RULES_BTN).should('not.exist');
  cy.get(RULES_TABLE).should('exist');
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
};

export const waitForRuleToChangeStatus = () => {
  cy.get(RULE_SWITCH_LOADER).should('exist');
  cy.get(RULE_SWITCH_LOADER).should('not.exist');
};

export const checkAutoRefresh = (ms: number, condition: string) => {
  cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
  cy.tick(ms);
  cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should(condition);
};

export const changeRowsPerPageTo = (rowsCount: number) => {
  cy.get(PAGINATION_POPOVER_BTN).click({ force: true });
  cy.get(rowsPerPageSelector(rowsCount))
    .pipe(($el) => $el.trigger('click'))
    .should('not.exist');
};

export const changeRowsPerPageTo100 = () => {
  changeRowsPerPageTo(100);
};

export const goToPage = (pageNumber: number) => {
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
  cy.get(pageSelector(pageNumber)).last().click({ force: true });
};

export const importRules = (rulesFile: string) => {
  cy.get(RULE_IMPORT_MODAL).click();
  cy.get(INPUT_FILE).should('exist');
  cy.get(INPUT_FILE).trigger('click', { force: true }).attachFile(rulesFile).trigger('change');
  cy.get(RULE_IMPORT_MODAL_BUTTON).last().click({ force: true });
  cy.get(INPUT_FILE).should('not.exist');
};

export const selectOverwriteRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_CHECKBOX)
    .pipe(($el) => $el.trigger('click'))
    .should('be.checked');
};

export const selectOverwriteExceptionsRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_EXCEPTIONS_CHECKBOX)
    .pipe(($el) => $el.trigger('click'))
    .should('be.checked');
};

export const importRulesWithOverwriteAll = (rulesFile: string) => {
  cy.get(RULE_IMPORT_MODAL).click();
  cy.get(INPUT_FILE).should('exist');
  cy.get(INPUT_FILE).trigger('click', { force: true }).attachFile(rulesFile).trigger('change');
  selectOverwriteRulesImport();
  selectOverwriteExceptionsRulesImport();
  cy.get(RULE_IMPORT_MODAL_BUTTON).last().click({ force: true });
  cy.get(INPUT_FILE).should('not.exist');
};

export const testAllTagsBadges = (tags: string[]) => {
  cy.get(RULES_TAGS_POPOVER_BTN).each(($el) => {
    // open tags popover
    cy.wrap($el).click();
    cy.get(RULES_TAGS_POPOVER_WRAPPER).should('have.text', tags.join(''));
    // close tags popover
    cy.wrap($el).click();
  });
};
