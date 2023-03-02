/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addGeneratedActionValues } from './add_generated_action_values';
import { RuleAction } from '../../../common';

jest.mock('uuid', () => ({
  v4: () => '111-222',
}));

describe('addGeneratedActionValues()', () => {
  const mockAction: RuleAction = {
    id: '1',
    group: 'default',
    actionTypeId: 'slack',
    params: {},
    frequency: {
      summary: false,
      notifyWhen: 'onActiveAlert',
      throttle: null,
    },
    alertsFilter: {
      query: { kql: 'test:testValue' },
      timeframe: {
        days: [1, 2],
        hours: { start: '08:00', end: '17:00' },
      },
    },
  };

  test('adds uuid', async () => {
    const actionWithGeneratedValues = addGeneratedActionValues([mockAction]);
    expect(actionWithGeneratedValues[0].uuid).toBe('111-222');
  });

  test('adds DSL', async () => {
    const actionWithGeneratedValues = addGeneratedActionValues([mockAction]);
    expect(actionWithGeneratedValues[0].alertsFilter?.query?.dsl).toBe(
      '{"bool":{"should":[{"match":{"test":"testValue"}}],"minimum_should_match":1}}'
    );
  });

  test('throws error if KQL is not valid', async () => {
    expect(() =>
      addGeneratedActionValues([
        { ...mockAction, alertsFilter: { query: { kql: 'foo:bar:1' }, timeframe: null } },
      ])
    ).toThrowErrorMatchingInlineSnapshot('"Error creating DSL query: invalid KQL"');
  });
});
