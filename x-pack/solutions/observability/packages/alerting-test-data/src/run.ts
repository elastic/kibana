/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmErrorCountRule } from './create_apm_error_count_threshold_rule';
import { createApmFailedTransactionRateRule } from './create_apm_failed_transaction_rate_rule';
import { createCustomThresholdRule } from './create_custom_threshold_rule';
import { createDataView } from './create_data_view';
import { createIndexConnector } from './create_index_connector';

import { scenario1, scenario2, scenario3, scenario4, scenario5, scenario6 } from './scenarios';

const scenarios = [
  // Logs use-cases
  scenario1,
  scenario2,
  scenario3,
  // Metrics use-cases
  scenario4,
  scenario5,
  scenario6,
];

/* eslint-disable no-console */
export async function run() {
  console.log('Creating index connector - start');
  const response = await createIndexConnector();
  const actionId = await response.data.id;
  console.log('Creating index connector - finished - actionId: ', actionId);
  for (const scenario of scenarios) {
    if (scenario.dataView.shouldCreate) {
      console.log('Creating data view - start - id: ', scenario.dataView.id);
      await createDataView(scenario.dataView);
      console.log('Creating data view - finished - id: ', scenario.dataView.id);
    }
    console.log('Creating Custom threshold rule - start - name: ', scenario.ruleParams.name);
    await createCustomThresholdRule(actionId, scenario.dataView.id, scenario.ruleParams);
    console.log('Creating Custom threshold rule - finished - name: ', scenario.ruleParams.name);
  }

  console.log('Creating APM error count rule - start');
  await createApmErrorCountRule(actionId);
  console.log('Creating APM error count rule - finished');

  console.log('Creating APM failed transaction rate rule - start');
  await createApmFailedTransactionRateRule(actionId);
  console.log('Creating APM failed transaction rate rule - finished');
}
