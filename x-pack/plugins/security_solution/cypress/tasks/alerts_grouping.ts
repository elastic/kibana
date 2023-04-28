/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GROUP_COUNT,
  GROUP_LEVEL_SELECTOR,
  GROUP_OPTION_SELECTOR,
  GROUP_PAGINATION_SELECTOR,
  GROUP_SELECTOR,
  GROUP_SELECTOR_OPTION,
} from '../screens/alerts';

export const selectGroup = (groupName: string) => {
  cy.get(GROUP_SELECTOR).click();
  cy.get(GROUP_OPTION_SELECTOR(groupName)).click();
};

// TODO: @Glo please help here, these clicks are flakey
export const openGroup = (groupName?: 'first' | 'last') => {
  if (groupName === 'last') {
    cy.get(GROUP_SELECTOR_OPTION).last().click({ force: true });
    return;
  }
  cy.get(GROUP_SELECTOR_OPTION).first().click({ force: true });
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
