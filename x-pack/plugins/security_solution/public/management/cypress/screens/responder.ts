/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj as testSubjSelector } from '@kbn/test-subj-selector';

const TEST_SUBJ = Object.freeze({
  responderPage: 'consolePageOverlay',
  actionLogFlyout: 'responderActionLogFlyout',
});

const ensureOnResponder = (): Cypress.Chainable<JQuery<HTMLDivElement>> => {
  return cy.getByTestSubj<HTMLDivElement>(TEST_SUBJ.responderPage).should('exist');
};

export const closeResponder = (): void => {
  ensureOnResponder();
  cy.get('consolePageOverlay-header-back-link').click();
  cy.getByTestSubj(TEST_SUBJ.responderPage).should('not.exist');
};

export const openResponderActionLogFlyout = (): void => {
  ensureOnResponder();
  cy.getByTestSubj('responderShowActionLogButton')
    .click()
    .getByTestSubj(TEST_SUBJ.actionLogFlyout)
    .should('exist');
};

export const closeResponderActionLogFlyout = (): void => {
  ensureOnResponder()
    .findByTestSubj(TEST_SUBJ.actionLogFlyout)
    .then((flyout) => {
      // If its open, then close it
      if (flyout.length) {
        cy.get(testSubjSelector(TEST_SUBJ.actionLogFlyout))
          .findByTestSubj(testSubjSelector('euiFlyoutCloseButton'))
          .click()
          .getByTestSubj(TEST_SUBJ.actionLogFlyout)
          .should('not.exist');
      }
    });
};

export const openResponderActionLogDatePickerQuickMenu = (): void => {
  ensureOnResponder();
  cy.get(testSubjSelector(TEST_SUBJ.actionLogFlyout))
    .findByTestSubj(testSubjSelector('superDatePickerToggleQuickMenuButton'))
    .click()
    .should('not.exist');
};
