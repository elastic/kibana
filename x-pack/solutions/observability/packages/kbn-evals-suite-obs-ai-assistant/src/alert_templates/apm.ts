/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
