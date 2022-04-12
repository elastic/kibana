/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KQL_INPUT, REFRESH_BUTTON } from '../screens/security_header';

export const clearSearchBar = () => {
  cy.get(KQL_INPUT).clear().type('{enter}');
};

export const kqlSearch = (search: string) => {
  clearSearchBar();
  cy.get(KQL_INPUT).type(search);
};

export const navigateFromHeaderTo = (page: string) => {
  cy.get(page).click({ force: true });
};

export const refreshPage = () => {
  cy.get(REFRESH_BUTTON)
    .click({ force: true })
    .should('not.have.attr', 'aria-label', 'Update query');
};
