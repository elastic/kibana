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
  RULE_AUTO_REFRESH_IDLE_MODAL,
  RULE_AUTO_REFRESH_IDLE_MODAL_CONTINUE,
  rowsPerPageSelector,
  pageSelector,
  DUPLICATE_RULE_ACTION_BTN,
  DUPLICATE_RULE_MENU_PANEL_BTN,
  DUPLICATE_RULE_BULK_BTN,
  RULES_ROW,
  SELECT_ALL_RULES_BTN,
  MODAL_CONFIRMATION_BTN,
  RULES_DELETE_CONFIRMATION_MODAL,
  ACTIVATE_RULE_BULK_BTN,
  DEACTIVATE_RULE_BULK_BTN,
  RULE_DETAILS_DELETE_BTN,
} from '../screens/alerts_detection_rules';
import { ALL_ACTIONS } from '../screens/rule_details';
import { LOADING_INDICATOR } from '../screens/security_header';

export const activateRule = (rulePosition: number) => {
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
 * and it is deactivated (default)
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

export const activateSelectedRules = () => {
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(ACTIVATE_RULE_BULK_BTN).click();
};

export const deactivateSelectedRules = () => {
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(DEACTIVATE_RULE_BULK_BTN).click();
};

export const exportFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(EXPORT_ACTION_BTN).click();
  cy.get(EXPORT_ACTION_BTN).should('not.exist');
};

export const filterByCustomRules = () => {
  cy.get(CUSTOM_RULES_BTN).click({ force: true });
  waitForRulesTableToBeRefreshed();
};

export const goToCreateNewRule = () => {
  cy.get(CREATE_NEW_RULE_BTN).click({ force: true });
};

export const goToRuleDetails = () => {
  cy.get(RULE_NAME).first().click({ force: true });
};

export const goToRuleDetailsByName = (name: string) => {
  cy.get(RULE_NAME).contains(name).click({ force: true });
};

export const loadPrebuiltDetectionRules = () => {
  cy.get(LOAD_PREBUILT_RULES_BTN).should('exist').click({ force: true });
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

export const sortByActivatedRules = () => {
  cy.get(SORT_RULES_BTN).contains('Activated').click({ force: true });
  waitForRulesTableToBeRefreshed();
  cy.get(SORT_RULES_BTN).contains('Activated').click({ force: true });
  waitForRulesTableToBeRefreshed();
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

export const dismissAllRulesIdleModal = () => {
  cy.get(RULE_AUTO_REFRESH_IDLE_MODAL_CONTINUE)
    .eq(1)
    .should('exist')
    .click({ force: true, multiple: true });
  cy.get(RULE_AUTO_REFRESH_IDLE_MODAL).should('not.exist');
};

export const checkAllRulesIdleModal = (condition: string) => {
  cy.tick(2700000);
  cy.get(RULE_AUTO_REFRESH_IDLE_MODAL).should(condition);
};

export const resetAllRulesIdleModalTimeout = () => {
  cy.tick(2000000);
  cy.window().trigger('mousemove', { force: true });
  cy.tick(700000);
};

export const changeRowsPerPageTo = (rowsCount: number) => {
  cy.get(PAGINATION_POPOVER_BTN).click({ force: true });
  cy.get(rowsPerPageSelector(rowsCount))
    .pipe(($el) => $el.trigger('click'))
    .should('not.be.visible');

  waitForRulesTableToBeRefreshed();
};

export const changeRowsPerPageTo100 = () => {
  changeRowsPerPageTo(100);
};

export const goToPage = (pageNumber: number) => {
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
  cy.get(pageSelector(pageNumber)).last().click({ force: true });
  waitForRulesTableToBeRefreshed();
};
