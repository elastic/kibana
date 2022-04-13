/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPORT_BTN, IMPORT_OBJECTS, INPUT } from '../screens/saved_objects';

export const importCase = (casePath: string) => {
  cy.get(IMPORT_OBJECTS).click();
  cy.get(INPUT).trigger('click', { force: true }).attachFile(casePath).trigger('change');
  cy.get(IMPORT_BTN).click({ force: true });
  cy.get(IMPORT_BTN).should('not.exist');
};
