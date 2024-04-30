/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators, Comparator } from '../../../../../../common/custom_threshold_rule/types';
import { CustomThresholdRuleTypeParams } from '../../../types';
import { getLogRateAnalysisEQQuery } from './log_rate_analysis_query';

describe('buildEsQuery', () => {
  const index = 'changedMockedIndex';
  const mockedParams: CustomThresholdRuleTypeParams = {
    groupBy: ['host.hostname'],
    searchConfiguration: {
      index,
      query: { query: 'optionalFilter: container-1', language: 'kuery' },
    },
    criteria: [
      {
        metrics: [
          {
            name: 'A',
            aggType: Aggregators.COUNT,
            filter: 'host.name: host-1 or host.name: host-2',
          },
        ],
        timeSize: 1,
        timeUnit: 'm',
        threshold: [90],
        comparator: Comparator.GT,
      },
    ],
  };
  const mockedAlertWithMultipleGroups = {
    fields: {
      'kibana.alert.group': [
        {
          field: 'groupByField',
          value: 'groupByValue',
        },
        {
          field: 'secondGroupByField',
          value: 'secondGroupByValue',
        },
      ],
    },
  };
  const testData: Array<{
    title: string;
    params: CustomThresholdRuleTypeParams;
    alert: any;
  }> = [
    {
      title: 'rule with optional filer, count filter and group by',
      params: mockedParams,
      alert: {
        fields: {
          'kibana.alert.group': [mockedAlertWithMultipleGroups.fields['kibana.alert.group'][0]],
        },
      },
    },
    {
      title: 'rule with optional filer, count filter and multiple group by',
      params: mockedParams,
      alert: mockedAlertWithMultipleGroups,
    },
    {
      title: 'rule with optional filer, count filter and WITHOUT group by',
      params: mockedParams,
      alert: {},
    },
    {
      title: 'rule without filter and with group by',
      params: {
        groupBy: ['host.hostname'],
        searchConfiguration: {
          index,
          query: { query: '', language: 'kuery' },
        },
        criteria: [
          {
            metrics: [{ name: 'A', aggType: Aggregators.COUNT }],
            timeSize: 1,
            timeUnit: 'm',
            threshold: [90],
            comparator: Comparator.GT,
          },
        ],
      },
      alert: {
        fields: {
          'kibana.alert.group': [mockedAlertWithMultipleGroups.fields['kibana.alert.group'][0]],
        },
      },
    },
    {
      title: 'rule with multiple metrics',
      params: {
        ...mockedParams,
        criteria: [
          {
            metrics: [
              { name: 'A', aggType: Aggregators.COUNT, filter: 'host.name: host-1' },
              { name: 'B', aggType: Aggregators.AVERAGE, field: 'system.load.1' },
            ],
            timeSize: 1,
            timeUnit: 'm',
            threshold: [90],
            comparator: Comparator.GT,
          },
        ],
      },
      alert: {},
    },
  ];

  test.each(testData)('should generate correct es query for $title', ({ alert, params }) => {
    expect(getLogRateAnalysisEQQuery(alert, params)).toMatchSnapshot();
  });
});
