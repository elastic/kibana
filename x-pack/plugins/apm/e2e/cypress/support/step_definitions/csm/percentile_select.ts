/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { verifyClientMetrics } from './client_metrics_helper';
import { getDataTestSubj } from './utils';

When('the user changes the selected percentile', () => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');

  getDataTestSubj('uxPercentileSelect').click();

  getDataTestSubj('p95Percentile').click();
});

Then(`it displays client metric related to that percentile`, () => {
  const metrics = ['14 ms', '131 ms', '55'];

  verifyClientMetrics(metrics, false);

  // reset to median
  getDataTestSubj('uxPercentileSelect').click();

  getDataTestSubj('p50Percentile').click();
});
