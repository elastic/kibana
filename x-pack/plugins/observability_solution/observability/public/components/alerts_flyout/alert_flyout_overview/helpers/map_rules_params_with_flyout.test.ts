/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TopAlert } from '../../../../typings/alerts';
import { mapRuleParamsWithFlyout } from './map_rules_params_with_flyout';

describe('Map rules params with flyout', () => {
  const testData = [
    {
      ruleType: 'apm.error_rate',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'apm.error_rate',
          'kibana.alert.rule.parameters': {
            threshold: 1,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },

          'kibana.alert.evaluation.value': 1,
          'kibana.alert.evaluation.threshold': 1,
        },
      },
      results: [
        {
          observedValue: [1],
          threshold: [1],
          comparator: '>',
          pctAboveThreshold: ' (0.00% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'apm.transaction_duration',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'apm.transaction_duration',
          'kibana.alert.rule.parameters': {
            aggregationType: 'avg',
            threshold: 1500,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },
          'kibana.alert.evaluation.value': 22872063,
          'kibana.alert.evaluation.threshold': 1500000,
        },
      },
      results: [
        {
          observedValue: ['23 s'],
          threshold: ['1.5 s'],
          comparator: '>',
          pctAboveThreshold: ' (1424.80% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'apm.transaction_error_rate',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
          'kibana.alert.rule.parameters': {
            threshold: 1,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },
          'kibana.alert.evaluation.value': 25,
          'kibana.alert.evaluation.threshold': 1,
        },
      },
      results: [
        {
          observedValue: ['25%'],
          threshold: ['1.0%'],
          comparator: '>',
          pctAboveThreshold: ' (2400.00% above the threshold)',
        },
      ],
    },
  ];

  it.each(testData)(
    'Map rules type ($ruleType) with the alert flyout is OK',
    ({ alert, results }) => {
      expect(mapRuleParamsWithFlyout(alert as unknown as TopAlert)).toMatchObject(results);
    }
  );
});
