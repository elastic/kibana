/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import pRetry from 'p-retry';

/**
 * Closes all currently displayed Toasts (if any)
 */
export const closeAllToasts = (): Cypress.Chainable<JQuery<HTMLBodyElement>> => {
  const toastCloseButtonSelector = testSubjSelector('toastCloseButton');
  const noToastsFoundError = new Error('none found');

  return cy.get('body').then(($body) => {
    return pRetry(
      async () => {
        const toasts = $body.find(toastCloseButtonSelector);

        if (toasts.length) {
          return toasts;
        } else {
          throw noToastsFoundError;
        }
      },
      { retries: 3, forever: false }
    )
      .then(($toasts) => {
        $toasts.each((_, $toast) => $toast.click());
        return $body;
      })
      .catch((error) => {
        if (error !== noToastsFoundError) {
          throw error;
        }

        return $body;
      });
  });
};

export const expectAndCloseSuccessToast = () => {
  cy.contains('Success');
  cy.getByTestSubj('toastCloseButton').click();
  cy.contains('Success').should('not.exist');
};
