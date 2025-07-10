/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getTestRuleData(overwrites = {}) {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    rule_type_id: 'test.noop',
    consumer: 'alertsFixture',
    schedule: { interval: '1m' },
    throttle: '1m',
    notify_when: 'onThrottleInterval',
    actions: [],
    params: {},
    ...overwrites,
  };
}
