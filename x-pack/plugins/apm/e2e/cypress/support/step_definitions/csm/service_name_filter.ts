/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { verifyClientMetrics } from './client_metrics_helper';
import { DEFAULT_TIMEOUT } from './csm_dashboard';
import { waitForLoadingToFinish } from './utils';

When('the user changes the selected service name', () => {
  waitForLoadingToFinish();
  cy.get(`[data-cy=serviceNameFilter]`, DEFAULT_TIMEOUT).select('client');
});

Then(`it displays relevant client metrics`, () => {
  const metrics = ['80 ms', '4 ms', '76 ms', '55'];

  verifyClientMetrics(metrics, false);
});
