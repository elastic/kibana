/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addGeneratedActionValues } from './add_generated_action_values';
import { RuleActionTypes, RuleDefaultAction, RuleSystemAction } from '../../../common';

jest.mock('uuid', () => ({
  v4: () => '111-222',
}));

describe('addGeneratedActionValues()', () => {
  const mockAction: RuleDefaultAction = {
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
      query: {
        kql: 'test:testValue',
        filters: [
          {
            meta: { key: 'foo', params: { query: 'bar' } },
            query: { match_phrase: { foo: 'bar ' } },
          },
        ],
      },
      timeframe: {
        days: [1, 2],
        hours: { start: '08:00', end: '17:00' },
        timezone: 'UTC',
      },
    },
  };

  const systemAction: RuleSystemAction = {
    id: '1',
    actionTypeId: '.test',
    params: {},
    uuid: 'my-uid',
    type: RuleActionTypes.SYSTEM,
  };

  test('adds uuid', async () => {
    const actionWithGeneratedValues = addGeneratedActionValues([mockAction]);
    expect(actionWithGeneratedValues[0].uuid).toBe('111-222');
  });

  test('does not overrides the uuid of a system action', async () => {
    const actionWithGeneratedValues = addGeneratedActionValues([systemAction]);
    expect(actionWithGeneratedValues[0].uuid).toBe('my-uid');
  });

  test('adds DSL', async () => {
    const actionWithGeneratedValues = addGeneratedActionValues([mockAction]);
    const defaultAction = actionWithGeneratedValues[0] as RuleDefaultAction;

    expect(defaultAction.alertsFilter?.query?.dsl).toBe(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"testValue"}}],"minimum_should_match":1}},{"match_phrase":{"foo":"bar "}}],"should":[],"must_not":[]}}'
    );
  });

  test('throws error if KQL is not valid', async () => {
    expect(() =>
      addGeneratedActionValues([
        {
          ...mockAction,
          alertsFilter: { query: { kql: 'foo:bar:1', filters: [] } },
        },
      ])
    ).toThrowErrorMatchingInlineSnapshot('"Error creating DSL query: invalid KQL"');
  });
});
