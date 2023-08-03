/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsApiContract } from '@kbn/actions-plugin/common';
import {
  RuleSystemAction,
  RuleActionTypes,
  RuleExecutionStatusErrorReasons,
  RuleLastRunOutcomeValues,
  SanitizedDefaultRuleAction,
} from '@kbn/alerting-plugin/common';
import { transformRule } from './common_transformations';

const dateFixed = Date.parse('2021-12-15T12:34:56.789Z');
const dateCreated = new Date(dateFixed - 2000);
const dateUpdated = new Date(dateFixed - 1000);
const dateExecuted = new Date(dateFixed);

describe('transformRule()', () => {
  const defaultAction: AsApiContract<SanitizedDefaultRuleAction> = {
    group: 'default',
    id: 'aaa',
    connector_type_id: 'bbb',
    params: {},
    frequency: {
      summary: false,
      notify_when: 'onThrottleInterval' as const,
      throttle: '1m',
    },
    alerts_filter: { query: { kql: 'test:1', filters: [] } },
  };

  const systemAction: AsApiContract<RuleSystemAction> = {
    id: 'system-action',
    uuid: '123',
    connector_type_id: 'bbb',
    params: {},
    type: RuleActionTypes.SYSTEM,
  };

  const rule = {
    id: 'some-id',
    name: 'some-name',
    enabled: true,
    tags: ['tag-1', 'tag-2'],
    rule_type_id: 'some-rule-type',
    consumer: 'some-consumer',
    schedule: { interval: '1s' },
    actions: [defaultAction, systemAction],
    params: { bar: 'foo', numbers: { 1: [2, 3] } } as never,
    scheduled_task_id: 'some-task-id',
    created_by: 'created-by-user',
    updated_by: null,
    created_at: dateCreated,
    updated_at: dateUpdated,
    api_key: 'some-api-key',
    api_key_owner: 'api-key-user',
    throttle: '2s',
    notify_when: 'onActiveAlert' as const,
    mute_all: false,
    muted_alert_ids: ['bob', 'jim'],
    revision: 0,
    muted_instance_ids: [],
    execution_status: {
      last_execution_date: dateExecuted,
      last_duration: 42,
      status: 'error',
      error: {
        reason: RuleExecutionStatusErrorReasons.Unknown,
        message: 'this is just a test',
      },
    },
    monitoring: {
      run: {
        history: [
          {
            timestamp: dateExecuted.getTime(),
            duration: 42,
            success: false,
            outcome: RuleLastRunOutcomeValues[2],
          },
        ],
        calculated_metrics: {
          success_ratio: 0,
          p50: 0,
          p95: 42,
          p99: 42,
        },
        last_run: {
          timestamp: dateExecuted.toISOString(),
          metrics: {
            duration: 42,
            total_search_duration_ms: 100,
          },
        },
      },
    },
    last_run: {
      outcome: RuleLastRunOutcomeValues[2],
      outcome_order: 20,
      outcome_msg: ['this is just a test'],
      warning: RuleExecutionStatusErrorReasons.Unknown,
      alerts_count: {
        new: 1,
        active: 2,
        recovered: 3,
        ignored: 4,
      },
    },
    next_run: dateUpdated.toISOString(),
  };

  it('transforms actions correctly', async () => {
    // @ts-expect-error: AsApiContract does not work with nested fields
    const res = transformRule(rule);
    expect(res.actions).toEqual([
      {
        actionTypeId: 'bbb',
        alertsFilter: { query: { filters: [], kql: 'test:1' } },
        frequency: { notifyWhen: 'onThrottleInterval', summary: false, throttle: '1m' },
        group: 'default',
        id: 'aaa',
        params: {},
      },
      {
        actionTypeId: 'bbb',
        id: 'system-action',
        params: {},
        type: RuleActionTypes.SYSTEM,
        uuid: '123',
      },
    ]);
  });
});
