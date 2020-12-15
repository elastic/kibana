/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callOutWithId, CALLOUT_DISMISS_BTN } from '../../screens/common/callouts';

export const getCallOut = (id: string, options?: Cypress.Timeoutable) => {
  return cy.get(callOutWithId(id), options);
};

export const waitForCallOutToBeShown = (id: string, color: string) => {
  getCallOut(id, { timeout: 10000 })
    .should('be.visible')
    .should('have.class', `euiCallOut--${color}`);
};

export const dismissCallOut = (id: string) => {
  getCallOut(id, { timeout: 10000 }).within(() => {
    cy.get(CALLOUT_DISMISS_BTN).should('be.visible').click();
    cy.root().should('not.exist');
  });
};
