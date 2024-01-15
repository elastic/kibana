/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
  BETWEEN = 'between',
  OUTSIDE_RANGE = 'outside',
}

export enum Aggregators {
  COUNT = 'count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  CARDINALITY = 'cardinality',
}

export const custom_threshold_AIAssistant_metric_avg = {
  ruleParams: {
    consumer: 'logs',
    name: 'metric_synth',
    rule_type_id: 'observability.rules.custom_threshold',
    params: {
      criteria: [
        {
          comparator: Comparator.GT,
          threshold: [0.5],
          timeSize: 2,
          timeUnit: 'h',
          metrics: [{ name: 'A', field: 'system.cpu.total.norm.pct', aggType: Aggregators.AVERAGE }],
        },
      ],
      groupBy: ['service.name'],
      searchConfiguration: {
        query: {
          query: '',
        },
      },
    },
    actions: [],
    schedule: {
      interval: '1m',
    },
  },
};
