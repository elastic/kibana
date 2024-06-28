/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialAlertValues } from './get_initial_alert_values';
import { RULE_TYPES_CONFIG } from '../../../../common/rules/apm_rule_types';
import { ApmRuleType } from '@kbn/rule-data-utils';

test('handles null rule type and undefined service name', () => {
  expect(getInitialAlertValues(null, undefined)).toEqual({ tags: ['apm'] });
});

test('handles valid rule type', () => {
  const ruleType = ApmRuleType.ErrorCount;
  expect(getInitialAlertValues(ruleType, undefined)).toEqual({
    name: RULE_TYPES_CONFIG[ruleType].name,
    tags: ['apm'],
  });

  expect(getInitialAlertValues(ruleType, 'Service Name')).toEqual({
    name: `${RULE_TYPES_CONFIG[ruleType].name} | Service Name`,
    tags: ['apm', `service.name:service name`],
  });
});
