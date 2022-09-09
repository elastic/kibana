/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELD_INPUT,
  OPERATOR_INPUT,
  CANCEL_BTN,
  EXCEPTION_ITEM_CONTAINER,
  EXCEPTION_FLYOUT_TITLE,
  VALUES_INPUT,
  VALUES_MATCH_ANY_INPUT,
  EXCEPTION_EDIT_FLYOUT_SAVE_BTN,
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

  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click();
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('have.attr', 'disabled');
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('not.exist');
};
