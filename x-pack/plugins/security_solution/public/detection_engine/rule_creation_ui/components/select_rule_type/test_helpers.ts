/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { act, fireEvent, within, screen } from '@testing-library/react';
import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';

export async function selectRuleType(ruleType: RuleType): Promise<void> {
  const testId = RULE_TYPE_TEST_ID_MAP[ruleType];

  await act(async () => fireEvent.click(screen.getByTestId(testId)));

  expect(within(screen.getByTestId(testId)).getByRole('switch')).toBeChecked();
}

const RULE_TYPE_TEST_ID_MAP = {
  query: 'customRuleType',
  saved_query: 'customRuleType',
  eql: 'eqlRuleType',
  machine_learning: 'machineLearningRuleType',
  threshold: 'thresholdRuleType',
  threat_match: 'threatMatchRuleType',
  new_terms: 'newTermsRuleType',
  esql: 'esqlRuleType',
};
