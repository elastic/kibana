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

  getDataTestSubj('uxPercentileSelect').select('95');
});

Then(`it displays client metric related to that percentile`, () => {
  const metrics = ['165 ms', '14 ms', '151 ms', '55'];

  verifyClientMetrics(metrics, false);

  getDataTestSubj('uxPercentileSelect').select('50');
});
