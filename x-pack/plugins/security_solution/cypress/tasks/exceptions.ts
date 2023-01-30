/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Exception } from '../objects/exception';
import {
  FIELD_INPUT,
  OPERATOR_INPUT,
  CANCEL_BTN,
  EXCEPTION_ITEM_CONTAINER,
  EXCEPTION_FLYOUT_TITLE,
  VALUES_INPUT,
  VALUES_MATCH_ANY_INPUT,
  EXCEPTION_EDIT_FLYOUT_SAVE_BTN,
  CLOSE_ALERTS_CHECKBOX,
  CONFIRM_BTN,
  EXCEPTION_ITEM_NAME_INPUT,
  CLOSE_SINGLE_ALERT_CHECKBOX,
  ADD_TO_RULE_RADIO_LABEL,
  ADD_TO_SHARED_LIST_RADIO_LABEL,
  SHARED_LIST_SWITCH,
  OS_SELECTION_SECTION,
  OS_INPUT,
} from '../screens/exceptions';

export const addExceptionEntryFieldValueOfItemX = (
  field: string,
  itemIndex = 0,
  fieldIndex = 0
) => {
  cy.get(EXCEPTION_ITEM_CONTAINER)
    .eq(itemIndex)
    .find(FIELD_INPUT)
    .eq(fieldIndex)
    .type(`${field}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const addExceptionEntryFieldValue = (field: string, index = 0) => {
  cy.get(FIELD_INPUT).eq(index).type(`${field}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const addExceptionEntryOperatorValue = (operator: string, index = 0) => {
  cy.get(OPERATOR_INPUT).eq(index).type(`${operator}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const addExceptionEntryFieldValueValue = (value: string, index = 0) => {
  cy.get(VALUES_INPUT).eq(index).type(`${value}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const addExceptionEntryFieldMatchAnyValue = (value: string, index = 0) => {
  cy.get(VALUES_MATCH_ANY_INPUT).eq(index).type(`${value}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const closeExceptionBuilderFlyout = () => {
  cy.get(CANCEL_BTN).click();
};

export const editException = (updatedField: string, itemIndex = 0, fieldIndex = 0) => {
  addExceptionEntryFieldValueOfItemX(`${updatedField}{downarrow}{enter}`, itemIndex, fieldIndex);
  addExceptionEntryFieldValueValue('foo', itemIndex);
};

export const addExceptionFlyoutItemName = (name: string) => {
  // waitUntil reduces the flakiness of this task because sometimes
  // there are background process/events happening which prevents cypress
  // to completely write the name of the exception before it page re-renders
  // thereby cypress losing the focus on the input element.
  cy.waitUntil(() => cy.get(EXCEPTION_ITEM_NAME_INPUT).then(($el) => Cypress.dom.isAttached($el)));
  cy.get(EXCEPTION_ITEM_NAME_INPUT).should('exist');
  cy.get(EXCEPTION_ITEM_NAME_INPUT).scrollIntoView();
  cy.get(EXCEPTION_ITEM_NAME_INPUT).should('be.visible');
  cy.get(EXCEPTION_ITEM_NAME_INPUT).first().focus();
  cy.get(EXCEPTION_ITEM_NAME_INPUT)
    .type(`${name}{enter}`, { force: true })
    .should('have.value', name);
};

export const editExceptionFlyoutItemName = (name: string) => {
  cy.root()
    .pipe(($el) => {
      return $el.find(EXCEPTION_ITEM_NAME_INPUT);
    })
    .clear()
    .type(`${name}{enter}`)
    .should('have.value', name);
};

export const selectBulkCloseAlerts = () => {
  cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');
  cy.get(CLOSE_ALERTS_CHECKBOX).click({ force: true });
};

export const selectCloseSingleAlerts = () => {
  cy.get(CLOSE_SINGLE_ALERT_CHECKBOX).click({ force: true });
};

export const addExceptionConditions = (exception: Exception) => {
  cy.root()
    .pipe(($el) => {
      return $el.find(FIELD_INPUT);
    })
    .type(`${exception.field}{downArrow}{enter}`);
  cy.get(OPERATOR_INPUT).type(`${exception.operator}{enter}`);
  exception.values.forEach((value) => {
    cy.get(VALUES_INPUT).type(`${value}{enter}`);
  });
};

export const submitNewExceptionItem = () => {
  cy.get(CONFIRM_BTN).click();
  cy.get(CONFIRM_BTN).should('not.exist');
};

export const submitEditedExceptionItem = () => {
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click();
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('not.exist');
};

export const selectAddToRuleRadio = () => {
  cy.get(ADD_TO_RULE_RADIO_LABEL).click();
};

export const selectSharedListToAddExceptionTo = (numListsToCheck = 1) => {
  cy.get(ADD_TO_SHARED_LIST_RADIO_LABEL).click();
  for (let i = 0; i < numListsToCheck; i++) {
    cy.get(SHARED_LIST_SWITCH)
      .eq(i)
      .pipe(($el) => $el.trigger('click'));
  }
};

export const selectOs = (os: string) => {
  cy.get(OS_SELECTION_SECTION).should('exist');
  cy.get(OS_INPUT).type(`${os}{downArrow}{enter}`);
};
