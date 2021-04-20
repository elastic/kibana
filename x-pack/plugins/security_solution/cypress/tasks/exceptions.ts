/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Exception } from '../objects/exception';
import {
  FIELD_INPUT,
  OPERATOR_INPUT,
  VALUES_INPUT,
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

export const addExceptionEntryValue = (values: string[], index = 0) => {
  values.forEach((value) => {
    cy.get(VALUES_INPUT).eq(index).type(`${value}{enter}`);
  });
  cy.get(BUILDER_MODAL_BODY).click();
};

export const addExceptionEntry = (exception: Exception, index = 0) => {
  addExceptionEntryFieldValue(exception.field, index);
  addExceptionEntryOperatorValue(exception.operator, index);
  addExceptionEntryValue(exception.values, index);
};

export const addNestedExceptionEntry = (exception: Exception, index = 0) => {
  addExceptionEntryFieldValue(exception.field, index);
  addExceptionEntryOperatorValue(exception.operator, index);
  addExceptionEntryValue(exception.values, index);
};

export const closeExceptionBuilderModal = () => {
  cy.get(CANCEL_BTN).click();
};
