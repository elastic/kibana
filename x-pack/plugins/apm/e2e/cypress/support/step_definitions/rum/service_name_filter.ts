/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from '../apm';
import { verifyClientMetrics } from './client_metrics_helper';

When('a user changes the selected service name', (filterName) => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get(`[data-cy=serviceNameFilter]`, { timeout: DEFAULT_TIMEOUT }).select(
    'opbean-client-rum'
  );
});

Then(`it displays relevant client metrics`, () => {
  const metrics = ['0.01 sec', '0.07 sec', '7 '];

  verifyClientMetrics(metrics, false);
});
