/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIRST_PAGE_SELECTOR, SECOND_PAGE_SELECTOR, SORT_BTN } from '../screens/pagination';

export const goToFirstPage = () => {
  cy.get(FIRST_PAGE_SELECTOR).last().click({ force: true });
};

export const goToSecondPage = () => {
  cy.get(SECOND_PAGE_SELECTOR).last().click({ force: true });
};

export const sortFirstColumn = () => {
  cy.get(SORT_BTN).first().click();
};
