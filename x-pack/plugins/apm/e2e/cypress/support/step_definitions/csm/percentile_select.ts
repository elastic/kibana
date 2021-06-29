/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { verifyClientMetrics } from './client_metrics_helper';
import { getDataTestSubj } from './utils';

When('the user changes the selected percentile', () => {
  getDataTestSubj('uxPercentileSelect').select('95');
});

Then(`it displays client metric related to that percentile`, () => {
  const metrics = ['165 ms', '14 ms', '151 ms', '55'];

  verifyClientMetrics(metrics, false);

  getDataTestSubj('uxPercentileSelect').select('50');
});
