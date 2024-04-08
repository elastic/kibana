/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TopAlert } from '../../../typings/alerts';
import { mapRuleParamsWithFlyout } from './map_rules_params_with_flyout';

describe('Map rules params with flyout', () => {
  const testData = [
    {
      ruleType: 'observability.rules.custom_threshold',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'observability.rules.custom_threshold',
          'kibana.alert.rule.parameters': {
            criteria: [
              {
                comparator: '>',
                metrics: [
                  {
                    name: 'A',
                    field: 'system.memory.usage',
                    aggType: 'avg',
                  },
                ],
                threshold: [1000000000],
                timeSize: 1,
                timeUnit: 'm',
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: 'apm_static_data_view_id_default',
            },
          },
          'kibana.alert.evaluation.threshold': 1000000000,
          'kibana.alert.evaluation.values': [1347892565.33],
        },
      },
      results: [
        {
          observedValue: '1,347,892,565.33',
          threshold: '1,000,000,000',
          comparator: '>',
          pctAboveThreshold: ' (34.79% above the threshold)',
        },
      ],
    },
    {
      ruleType: '.es-query',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': '.es-query',
          'kibana.alert.rule.parameters': {
            searchConfiguration: {
              query: {
                language: 'kuery',
                query: '',
              },
              index: 'apm_static_data_view_id_default',
            },
            timeField: '@timestamp',
            searchType: 'searchSource',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: [1],
            thresholdComparator: '>',
            size: 100,
            aggType: 'avg',
            aggField: 'system.disk.io',
            groupBy: 'all',
            termSize: 5,
            sourceFields: [
              {
                label: 'container.id',
                searchPath: 'container.id',
              },
              {
                label: 'host.hostname',
                searchPath: 'host.hostname',
              },
              {
                label: 'host.id',
                searchPath: 'host.id',
              },
              {
                label: 'host.name',
                searchPath: 'host.name',
              },
              {
                label: 'kubernetes.pod.uid',
                searchPath: 'kubernetes.pod.uid',
              },
            ],
            excludeHitsFromPreviousRun: false,
          },
          'kibana.alert.evaluation.value': 100870655162.18182,
          'kibana.alert.evaluation.threshold': 1,
        },
      },
      results: [
        {
          observedValue: [100870655162.18182],
          threshold: [1],
          comparator: '>',
          pctAboveThreshold: ' (10087065516118.18% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'logs.alert.document.count',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'logs.alert.document.count',
          'kibana.alert.rule.parameters': {
            timeSize: 5,
            timeUnit: 'm',
            logView: {
              type: 'log-view-reference',
              logViewId: 'default',
            },
            count: {
              value: 100,
              comparator: 'more than',
            },
            criteria: [
              {
                field: 'host.name',
                comparator: 'does not equal',
                value: 'test',
              },
            ],
            groupBy: ['host.name'],
          },
          'kibana.alert.evaluation.value': 4577,
          'kibana.alert.evaluation.threshold': 100,
        },
      },
      results: [
        {
          observedValue: [4577],
          threshold: [100],
          comparator: 'more than',
          pctAboveThreshold: ' (4477.00% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'metrics.alert.threshold',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
          'kibana.alert.rule.parameters': {
            criteria: [
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.01],
                timeSize: 1,
                timeUnit: 'm',
                metric: 'system.process.cpu.total.pct',
              },
            ],
          },
          'kibana.alert.evaluation.value': [0.06],
          'kibana.alert.evaluation.threshold': 0.01,
        },
      },
      results: [
        {
          observedValue: '6%',
          threshold: '1%',
          comparator: '>',
          pctAboveThreshold: ' (500.00% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'metrics.alert.inventory.threshold',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
          'kibana.alert.rule.parameters': {
            nodeType: 'host',
            criteria: [
              {
                metric: 'rx',
                comparator: '>',
                threshold: [3000000],
                timeSize: 1,
                timeUnit: 'm',
                customMetric: {
                  type: 'custom',
                  id: 'alert-custom-metric',
                  field: '',
                  aggregation: 'avg',
                },
              },
            ],
            sourceId: 'default',
          },

          'kibana.alert.evaluation.value': [1303266.4],
          'kibana.alert.evaluation.threshold': 3000000,
        },
      },
      results: [
        {
          observedValue: '10.4 Mbit',
          threshold: ['3 Mbit'],
          comparator: '>',
          pctAboveThreshold: ' (247.54% above the threshold)',
        },
      ],
    },
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
    {
      ruleType: 'slo.rules.burnRate',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
          'kibana.alert.evaluation.value': 66.02,
          'kibana.alert.evaluation.threshold': 0.07,
          'kibana.alert.rule.parameters': {
            windows: [
              {
                id: 'adf3db9b-7362-4941-8433-f6c285b1226a',
                burnRateThreshold: 0.07200000000000001,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
              {
                id: 'cff3b7d1-741b-42ca-882c-a4a39084c503',
                burnRateThreshold: 4.4639999999999995,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
              {
                id: '5be0fc9b-1376-48bd-b583-117a5472759a',
                burnRateThreshold: 7.127999999999999,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
              {
                id: '17b6002a-806f-415b-839c-66aea0f76da6',
                burnRateThreshold: 0.1,
                maxBurnRateThreshold: 10,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
            ],
            sloId: 'd463f5cf-e1d8-4a2b-ab5d-e750625e4599',
          },
        },
      },
      results: [
        {
          observedValue: [66.02],
          threshold: [0.07],
          comparator: '>',
          pctAboveThreshold: ' (94214.29% above the threshold)',
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
