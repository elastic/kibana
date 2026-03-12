/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const apmErrorCountAIInsight = {
  ruleParams: {
    consumer: 'apm',
    name: 'Error count threshold - payment service',
    rule_type_id: 'apm.error_rate',
    params: {
      threshold: 1,
      windowSize: 5,
      windowUnit: 'm',
      serviceName: 'payment',
      environment: 'ENVIRONMENT_ALL',
      groupBy: ['service.name', 'service.environment'],
    },
    actions: [],
    schedule: {
      interval: '1m',
    },
  },
};
