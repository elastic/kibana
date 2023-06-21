/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GROUP_COUNT,
  GROUP_LEVEL_SELECTOR,
  GROUP_LOADER,
  GROUP_OPTION_SELECTOR,
  GROUP_PAGINATION_SELECTOR,
  GROUP_SELECTOR,
  GROUP_SELECTOR_OPTION,
} from '../screens/alerts';

export const selectGroup = (groupName: string) => {
  cy.log('Selecting group');
  cy.get(GROUP_SELECTOR).click();
  cy.log('GROUP_SELECTOR', cy.get(GROUP_SELECTOR));
  console.log('GROUP_SELECTOR', cy.get(GROUP_SELECTOR));
  cy.get(GROUP_OPTION_SELECTOR(groupName)).click();
};

// TODO: @Glo please help here, these clicks are flakey
export const openGroup = (groupName?: 'first' | 'last') => {
  cy.get(GROUP_LOADER).should('not.exist');
  if (groupName === 'last') {
    cy.get(GROUP_SELECTOR_OPTION)
      .last()
      .within(() => {
        cy.get('h5').click({ force: true });
      });
    return;
  }
  scrollGroupsIntoView();
  cy.get(GROUP_SELECTOR_OPTION)
    .first()
    .within(() => {
      cy.get('h5').click({ force: true });
    });
};

export const scrollGroupsIntoView = () => {
  cy.get(GROUP_COUNT).scrollIntoView();
};

export const getGroupLevel = (num: number, func: () => void) => {
  cy.get(GROUP_LEVEL_SELECTOR(num)).within(() => {
    func();
  });
};

export const getGroupPagination = (num: number, func: () => void) => {
  cy.get(GROUP_PAGINATION_SELECTOR(num)).within(() => {
    func();
  });
};
