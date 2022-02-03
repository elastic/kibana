/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizedEventFields } from './use_add_to_case';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { merge } from 'lodash';

const defaultArgs = {
  _id: 'test-id',
  data: [
    { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
    { field: ALERT_RULE_UUID, value: ['data-rule-id'] },
    { field: ALERT_RULE_NAME, value: ['data-rule-name'] },
  ],
  ecs: {
    _id: 'test-id',
    _index: 'test-index',
    signal: { rule: { id: ['rule-id'], name: ['rule-name'], false_positives: [] } },
  },
};
describe('normalizedEventFields', () => {
  it('uses rule data when provided', () => {
    const result = normalizedEventFields(defaultArgs);
    expect(result).toEqual({
      ruleId: 'data-rule-id',
      ruleName: 'data-rule-name',
    });
  });
  const makeObj = (s: string, v: string[]) => {
    const keys = s.split('.');
    return keys
      .reverse()
      .reduce((prev, current, i) => (i === 0 ? { [current]: v } : { [current]: { ...prev } }), {});
  };
  it('uses rule/ecs combo Xavier thinks is a thing but Steph has yet to see', () => {
    const args = {
      ...defaultArgs,
      data: [],
      ecs: {
        _id: 'string',
        ...merge(
          makeObj(ALERT_RULE_UUID, ['xavier-rule-id']),
          makeObj(ALERT_RULE_NAME, ['xavier-rule-name'])
        ),
      },
    };
    const result = normalizedEventFields(args);
    expect(result).toEqual({
      ruleId: 'xavier-rule-id',
      ruleName: 'xavier-rule-name',
    });
  });
  it('falls back to use ecs data', () => {
    const result = normalizedEventFields({ ...defaultArgs, data: [] });
    expect(result).toEqual({
      ruleId: 'rule-id',
      ruleName: 'rule-name',
    });
  });
  it('returns null when all the data is bad', () => {
    const result = normalizedEventFields({ ...defaultArgs, data: [], ecs: { _id: 'bad' } });
    expect(result).toEqual({
      ruleId: null,
      ruleName: null,
    });
  });
});
