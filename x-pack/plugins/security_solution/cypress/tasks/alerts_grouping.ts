/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROUP_OPTION_SELECTOR, GROUP_SELECTOR } from '../screens/alerts';

export const selectGroup = (groupName: string) => {
  cy.get(GROUP_SELECTOR).click();
  cy.get(GROUP_OPTION_SELECTOR(groupName)).click();
};
