/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  GLOBAL_SEARCH_BAR_ADD_FILTER,
  ADD_FILTER_FORM_SAVE_BUTTON,
  ADD_FILTER_FORM_FIELD_INPUT,
  ADD_FILTER_FORM_OPERATOR_OPTION_IS,
  ADD_FILTER_FORM_OPERATOR_FIELD,
  ADD_FILTER_FORM_FIELD_OPTION,
  ADD_FILTER_FORM_FILTER_VALUE_INPUT,
} from '../screens/search_bar';

export const openAddFilterPopover = () => {
  cy.get(GLOBAL_SEARCH_BAR_ADD_FILTER).click({ force: true });
};

export const fillAddFilterForm = (filterKey: string, filterValue: string) => {
  cy.get(ADD_FILTER_FORM_FIELD_INPUT).type(filterKey);
  cy.get(ADD_FILTER_FORM_FIELD_OPTION(filterKey)).click({ force: true });
  cy.get(ADD_FILTER_FORM_OPERATOR_FIELD).click();
  cy.get(ADD_FILTER_FORM_OPERATOR_OPTION_IS).click();
  cy.get(ADD_FILTER_FORM_FILTER_VALUE_INPUT).type(filterValue);
  cy.get(ADD_FILTER_FORM_SAVE_BUTTON).click();
};
