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

export const customThresholdAIAssistantLogCount = {
  dataViewParams: {
    contentTypeId: 'index-pattern',
    data: {
      fieldAttrs: '{}',
      title: '.ds-logs-apm.*',
      timeFieldName: '@timestamp',
      sourceFilters: '[]',
      fields: '[]',
      fieldFormatMap: '{}',
      typeMeta: '{}',
      runtimeFieldMap: '{}',
      name: 'logs_synth',
    },
    options: { id: 'logs_synth' },
    version: 1,
  },

  ruleParams: {
    tags: ['observability'],
    consumer: 'logs',
    name: 'Threshold surpassed in AI Assistant eval',
    rule_type_id: 'observability.rules.custom_threshold',
    params: {
      criteria: [
        {
          comparator: Comparator.GT,
          threshold: [10],
          timeSize: 2,
          timeUnit: 'h',
          metrics: [{ name: 'A', filter: '', aggType: Aggregators.COUNT }],
        },
      ],
      groupBy: ['service.name'],
      alertOnNoData: true,
      alertOnGroupDisappear: true,
      searchConfiguration: {
        query: {
          query: '',
          language: 'kuery',
        },
        index: 'logs_synth',
      },
    },
    actions: [],
    schedule: {
      interval: '1m',
    },
  },
};

export const customThresholdAIAssistantMetricAvg = {
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
          metrics: [
            { name: 'A', field: 'system.cpu.total.norm.pct', aggType: Aggregators.AVERAGE },
          ],
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

export const apmTransactionRateAIAssistant = {
  ruleParams: {
    consumer: 'apm',
    name: 'apm_transaction_rate_AIAssistant',
    rule_type_id: 'apm.transaction_error_rate',
    params: {
      threshold: 10,
      windowSize: 1,
      windowUnit: 'h',
      transactionType: undefined,
      serviceName: undefined,
      environment: 'production',
      searchConfiguration: {
        query: {
          query: ``,
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment'],
      useKqlFilter: true,
    },
    actions: [],
    schedule: {
      interval: '1m',
    },
  },
};

export const apmErrorCountAIAssistant = {
  ruleParams: {
    consumer: 'apm',
    name: 'apm_error_count_AIAssistant',
    rule_type_id: 'apm.error_rate',
    params: {
      threshold: 5,
      windowSize: 1,
      windowUnit: 'h',
      transactionType: undefined,
      serviceName: undefined,
      environment: 'test',
      searchConfiguration: {
        query: {
          query: ``,
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment'],
      useKqlFilter: true,
    },
    actions: [],
    schedule: {
      interval: '1m',
    },
  },
};
