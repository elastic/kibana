/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/alerting-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { Aggregators, Comparator } from '../../../../common/alerting/metrics';
import { MetricThresholdRuleTypeParams } from '..';

export const buildMetricThresholdRule = (
  rule: Partial<Rule<MetricThresholdRuleTypeParams>> = {}
): Rule<MetricThresholdRuleTypeParams> => {
  return {
    alertTypeId: 'metrics.alert.threshold',
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: new Date('2023-02-20T15:25:32.125Z'),
    updatedAt: new Date('2023-03-02T16:24:41.177Z'),
    apiKey: 'apiKey',
    apiKeyOwner: 'admin',
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: [],
    executionStatus: {
      lastExecutionDate: new Date('2023-03-10T12:58:07.823Z'),
      lastDuration: 3882,
      status: 'ok',
    },
    actions: [],
    scheduledTaskId: 'cfd9c4f0-b132-11ed-88f2-77e0607bce49',
    isSnoozedUntil: null,
    lastRun: {
      outcomeMsg: null,
      outcomeOrder: 0,
      alertsCount: {
        new: 0,
        ignored: 0,
        recovered: 0,
        active: 0,
      },
      warning: null,
      outcome: 'succeeded',
    },
    nextRun: new Date('2023-03-10T12:59:07.592Z'),
    id: uuidv4(),
    consumer: 'alerts',
    tags: [],
    name: 'Monitoring hosts',
    enabled: true,
    throttle: null,
    running: false,
    schedule: {
      interval: '1m',
    },
    params: {
      criteria: [
        {
          aggType: Aggregators.COUNT,
          comparator: Comparator.GT,
          threshold: [2000],
          timeSize: 15,
          timeUnit: 'm',
        },
        {
          aggType: Aggregators.MAX,
          comparator: Comparator.GT,
          threshold: [4],
          timeSize: 15,
          timeUnit: 'm',
          metric: 'system.cpu.user.pct',
          warningComparator: Comparator.GT,
          warningThreshold: [2.2],
        },
        {
          aggType: Aggregators.MIN,
          comparator: Comparator.GT,
          threshold: [0.8],
          timeSize: 15,
          timeUnit: 'm',
          metric: 'system.memory.used.pct',
        },
      ],
      filterQuery:
        '{"bool":{"filter":[{"bool":{"should":[{"term":{"host.hostname":{"value":"Maryams-MacBook-Pro.local"}}}],"minimum_should_match":1}},{"bool":{"should":[{"term":{"service.type":{"value":"system"}}}],"minimum_should_match":1}}]}}',
      groupBy: ['host.hostname'],
    },
    monitoring: {
      run: {
        history: [
          {
            duration: 4433,
            success: true,
            timestamp: 1678375661786,
          },
        ],
        calculated_metrics: {
          success_ratio: 1,
          p99: 7745,
          p50: 4909.5,
          p95: 6319,
        },
        last_run: {
          timestamp: '2023-03-10T12:58:07.823Z',
          metrics: {
            total_search_duration_ms: null,
            total_indexing_duration_ms: null,
            total_alerts_detected: null,
            total_alerts_created: null,
            gap_duration_s: null,
            duration: 3882,
          },
        },
      },
    },
    revision: 1,
    ...rule,
  };
};
