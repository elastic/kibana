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
  BUILDER_MODAL_BODY,
  EXCEPTION_ITEM_CONTAINER,
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
  cy.get(BUILDER_MODAL_BODY).click();
};

export const addExceptionEntryFieldValue = (field: string, index = 0) => {
  cy.get(FIELD_INPUT).eq(index).type(`${field}{enter}`);
  cy.get(BUILDER_MODAL_BODY).click();
};

export const addExceptionEntryOperatorValue = (operator: string, index = 0) => {
  cy.get(OPERATOR_INPUT).eq(index).type(`${operator}{enter}`);
  cy.get(BUILDER_MODAL_BODY).click();
};

export const closeExceptionBuilderFlyout = () => {
  cy.get(CANCEL_BTN).click();
};
