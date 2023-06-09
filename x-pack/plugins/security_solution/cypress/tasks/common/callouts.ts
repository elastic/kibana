/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callOutWithId, CALLOUT_DISMISS_BTN } from '../../screens/common/callouts';

export const getCallOut = (id: string, options?: Cypress.Timeoutable) => {
  return cy.get(callOutWithId(id), options);
};

export const waitForCallOutToBeShown = (id: string, color: string) => {
  getCallOut(id).should('have.class', `euiCallOut--${color}`);
};

export const dismissCallOut = (id: string) => {
  getCallOut(id).find(CALLOUT_DISMISS_BTN).click();
  getCallOut(id).should('not.exist');
};
