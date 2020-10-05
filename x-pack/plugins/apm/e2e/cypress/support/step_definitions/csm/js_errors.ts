/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from './csm_dashboard';
import { loginAndWaitForPage } from '../../../integration/helpers';
import { getDataTestSubj } from './utils';

/** The default time in ms to wait for a Cypress command to complete */

Given(`a user is on the user experience`, () => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');
  cy.url().then((url) => {
    if (!url.includes('/app/ux')) {
      // open service overview page
      const RANGE_FROM = 'now-24h';
      const RANGE_TO = 'now';
      loginAndWaitForPage(
        `/app/ux`,
        {
          from: RANGE_FROM,
          to: RANGE_TO,
        },
        'client'
      );
    }
  });
});

Then(`it displays list of relevant js errors`, () => {
  cy.get('.euiBasicTable-loading').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  getDataTestSubj('uxJsErrorsTotal').should('have.text', 'Total errors110');

  getDataTestSubj('uxJsErrorRate').should(
    'have.text',
    'Error rate100 %Error rate 100 %'
  );

  getDataTestSubj('uxJsErrorTable').within(() => {
    cy.get('tr.euiTableRow', DEFAULT_TIMEOUT)
      .eq(0)
      .invoke('text')
      .should('eq', 'Error messageTest CaptureErrorImpacted page loads100.0 %');

    cy.get('tr.euiTableRow', DEFAULT_TIMEOUT)
      .eq(1)
      .invoke('text')
      .should(
        'eq',
        'Error messageUncaught Error: Test Error in ordersImpacted page loads100.0 %'
      );
  });
});
