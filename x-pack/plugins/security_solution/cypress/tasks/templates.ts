/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_TEMPLATES, NUMBER_OF_ROWS } from '../screens/templates';

export const selectCustomTemplates = () => {
  cy.get(CUSTOM_TEMPLATES).click({ force: true });
  cy.get(NUMBER_OF_ROWS).should('have.length', '1');
};
