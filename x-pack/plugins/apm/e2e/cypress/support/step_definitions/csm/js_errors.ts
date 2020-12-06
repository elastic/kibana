/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from './csm_dashboard';
import { getDataTestSubj } from './utils';

Then(`it displays list of relevant js errors`, () => {
  cy.get('.euiBasicTable-loading').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  getDataTestSubj('uxJsErrorsTotal').should('have.text', 'Total errors112');

  getDataTestSubj('uxJsErrorTable').within(() => {
    cy.get('tr.euiTableRow', DEFAULT_TIMEOUT)
      .eq(0)
      .invoke('text')
      .should('eq', 'Error messageTest CaptureErrorImpacted page loads100.0 %');
  });
});
