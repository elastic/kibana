/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Aggregators, Comparator } from '../../../../common/custom_threshold_rule/types';

import { MetricThresholdAlert, MetricThresholdRule } from '../components/alert_details_app_section';

export const buildMetricThresholdRule = (
  rule: Partial<MetricThresholdRule> = {}
): MetricThresholdRule => {
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
      searchConfiguration: {
        query: {
          query: 'host.hostname: Users-System.local and service.type: system',
          language: 'kuery',
        },
        index: 'mockedIndex',
      },
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

export const buildMetricThresholdAlert = (
  alert: Partial<MetricThresholdAlert> = {}
): MetricThresholdAlert => {
  return {
    link: '/app/metrics/explorer',
    reason: 'system.cpu.user.pct reported no data in the last 1m for ',
    fields: {
      'kibana.alert.rule.parameters': {
        criteria: [
          {
            aggType: Aggregators.AVERAGE,
            comparator: Comparator.GT,
            threshold: [2000],
            timeSize: 15,
            timeUnit: 'm',
            metric: 'system.cpu.user.pct',
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
        ],
        sourceId: 'default',
        alertOnNoData: true,
        alertOnGroupDisappear: true,
      },
      'kibana.alert.evaluation.values': [2500, 5],
      'kibana.alert.rule.category': 'Custom threshold (Technical Preview)',
      'kibana.alert.rule.consumer': 'alerts',
      'kibana.alert.rule.execution.uuid': '62dd07ef-ead9-4b1f-a415-7c83d03925f7',
      'kibana.alert.rule.name': 'One condition',
      'kibana.alert.rule.producer': 'observability',
      'kibana.alert.rule.rule_type_id': 'observability.rules.custom_threshold',
      'kibana.alert.rule.uuid': '3a1ed8c0-c1a8-11ed-9249-ed6d75986bdc',
      'kibana.space_ids': ['default'],
      'kibana.alert.rule.tags': [],
      '@timestamp': '2023-03-28T14:40:00.000Z',
      'kibana.alert.reason': 'system.cpu.user.pct reported no data in the last 1m for ',
      'kibana.alert.action_group': 'custom_threshold.nodata',
      tags: [],
      'kibana.alert.duration.us': 248391946000,
      'kibana.alert.time_range': {
        gte: '2023-03-13T14:06:23.695Z',
      },
      'kibana.alert.instance.id': '*',
      'kibana.alert.start': '2023-03-28T13:40:00.000Z',
      'kibana.alert.uuid': '50faddcd-c0a0-4122-a068-c204f4a7ec87',
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'event.kind': 'signal',
      'event.action': 'active',
      'kibana.version': '8.8.0',
      'kibana.alert.flapping': false,
      'kibana.alert.rule.revision': 1,
    },
    active: true,
    start: 1678716383695,
    lastUpdated: 1678964775641,
    ...alert,
  };
};
