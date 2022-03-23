/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BULK_ACTIONS_BTN,
  BULK_ACTIONS_PROGRESS_BTN,
  MODAL_CONFIRMATION_TITLE,
  MODAL_CONFIRMATION_BODY,
  TOASTER_BODY,
} from '../screens/alerts_detection_rules';

import {
  INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  ADD_INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  DELETE_INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  TAGS_RULE_BULK_MENU_ITEM,
  ADD_TAGS_RULE_BULK_MENU_ITEM,
  DELETE_TAGS_RULE_BULK_MENU_ITEM,
  RULES_BULK_EDIT_FORM_TITLE,
  RULES_BULK_EDIT_INDEX_PATTERNS,
  RULES_BULK_EDIT_TAGS,
  RULES_BULK_EDIT_FORM_CONFIRM_BTN,
} from '../screens/rules_bulk_edit';

export const clickAddIndexPatternsMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
  cy.get(ADD_INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
};

export const openBulkEditAddIndexPatternsForm = () => {
  clickAddIndexPatternsMenuItem();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add index patterns');
};

export const openBulkEditDeleteIndexPatternsForm = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
  cy.get(DELETE_INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Delete index patterns');
};

export const openBulkEditAddTagsForm = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(TAGS_RULE_BULK_MENU_ITEM).click();
  cy.get(ADD_TAGS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add tags');
};

export const openBulkEditDeleteTagsForm = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(TAGS_RULE_BULK_MENU_ITEM).click();
  cy.get(DELETE_TAGS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Delete tags');
};

export const typeIndexPatterns = (indices: string[]) => {
  cy.get(RULES_BULK_EDIT_INDEX_PATTERNS).find('input').type(indices.join('{enter}'));
};

export const typeTags = (tags: string[]) => {
  cy.get(RULES_BULK_EDIT_TAGS).find('input').type(tags.join('{enter}'));
};

export const confirmBulkEditForm = () => cy.get(RULES_BULK_EDIT_FORM_CONFIRM_BTN).click();

export const waitForBulkEditActionToFinish = ({ rulesCount }: { rulesCount: number }) => {
  cy.get(BULK_ACTIONS_PROGRESS_BTN).should('be.disabled');
  cy.contains(TOASTER_BODY, `You’ve successfully updated ${rulesCount} rule`);
};

export const waitForElasticRulesBulkEditModal = (rulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_TITLE).should(
    'have.text',
    `${rulesCount} Elastic rules cannot be edited`
  );
  cy.get(MODAL_CONFIRMATION_BODY).should(
    'have.text',
    'Elastic rules are not modifiable. The update action will only be applied to Custom rules.'
  );
};

export const waitForMixedRulesBulkEditModal = (
  elasticRulesCount: number,
  customRulesCount: number
) => {
  cy.get(MODAL_CONFIRMATION_TITLE).should(
    'have.text',
    `${elasticRulesCount} Elastic rules cannot be edited`
  );

  cy.get(MODAL_CONFIRMATION_BODY).should(
    'have.text',
    `The update action will only be applied to ${customRulesCount} Custom rules you’ve selected.`
  );
};
