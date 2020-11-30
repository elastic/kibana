/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { verifyClientMetrics } from './client_metrics_helper';
import { DEFAULT_TIMEOUT } from './csm_dashboard';

When('the user changes the selected service name', () => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get(`[data-cy=serviceNameFilter]`, DEFAULT_TIMEOUT).select('client');
});

Then(`it displays relevant client metrics`, () => {
  const metrics = ['80 ms', '4 ms', '76 ms', '55'];

  verifyClientMetrics(metrics, false);
});
