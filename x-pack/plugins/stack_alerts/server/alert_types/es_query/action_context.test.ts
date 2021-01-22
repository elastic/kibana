/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsQueryAlertActionContext, addMessages } from './action_context';
import { EsQueryAlertParamsSchema } from './alert_type_params';

describe('ActionContext', () => {
  it('generates expected properties', async () => {
    const params = EsQueryAlertParamsSchema.validate({
      index: ['[index]'],
      timeField: '[timeField]',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [4],
    });
    const base: EsQueryAlertActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 42,
      conditions: 'count greater than 4',
      hits: [],
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(`"alert '[alert-name]' matched query"`);
    expect(context.message).toEqual(
      `alert '[alert-name]' is active:

- Value: 42
- Conditions Met: count greater than 4 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z`
    );
  });

  it('generates expected properties if comparator is between', async () => {
    const params = EsQueryAlertParamsSchema.validate({
      index: ['[index]'],
      timeField: '[timeField]',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: 'between',
      threshold: [4, 5],
    });
    const base: EsQueryAlertActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 4,
      conditions: 'count between 4 and 5',
      hits: [],
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(`"alert '[alert-name]' matched query"`);
    expect(context.message).toEqual(
      `alert '[alert-name]' is active:

- Value: 4
- Conditions Met: count between 4 and 5 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z`
    );
  });
});
