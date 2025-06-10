/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule } from './create_rule';

export const createApmErrorCountRule = async (actionId: string) => {
  const apmErrorRateRuleParams = {
    tags: ['apm'],
    consumer: 'apm',
    name: 'apm_error_count_threshold',
    rule_type_id: 'apm.error_rate',
    params: {
      threshold: 5,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: undefined,
      serviceName: undefined,
      environment: 'ENVIRONMENT_ALL',
      searchConfiguration: {
        query: {
          query: 'service.environment: "rule-test"',
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment'],
      useKqlFilter: true,
    },
    actions: [
      {
        group: 'threshold_met',
        id: actionId,
        params: {
          documents: [
            {
              ruleName: '{{rule.name}}',
              alertDetailsUrl: '{{context.alertDetailsUrl}}',
              environment: '{{context.environment}}',
              interval: '{{context.interval}}',
              reason: '{{context.reason}}',
              serviceName: '{{context.serviceName}}',
              threshold: '{{context.threshold}}',
              transactionName: '{{context.transactionName}}',
              transactionType: '{{context.transactionType}}',
              triggerValue: '{{context.triggerValue}}',
              viewInAppUrl: '{{context.viewInAppUrl}}',
            },
          ],
        },
        frequency: {
          notify_when: 'onActionGroupChange',
          throttle: null,
          summary: false,
        },
      },
    ],
    schedule: {
      interval: '1m',
    },
  };

  return createRule(apmErrorRateRuleParams);
};
