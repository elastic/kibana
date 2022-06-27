/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseActionContext, addMessages } from './action_context';
import { ParamsSchema } from './alert_type_params';

describe('ActionContext', () => {
  it('generates expected properties if aggField is null', async () => {
    const params = ParamsSchema.validate({
      index: '[index]',
      timeField: '[timeField]',
      aggType: 'count',
      groupBy: 'top',
      termField: 'x',
      termSize: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [4],
    });
    const base: BaseActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      group: '[group]',
      value: 42,
      conditions: 'count greater than 4',
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(`"alert [alert-name] group [group] met threshold"`);
    expect(context.message).toEqual(
      `alert '[alert-name]' is active for group '[group]':

- Value: 42
- Conditions Met: count greater than 4 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z`
    );
  });

  it('generates expected properties if aggField is not null', async () => {
    const params = ParamsSchema.validate({
      index: '[index]',
      timeField: '[timeField]',
      aggType: 'avg',
      groupBy: 'top',
      termField: 'x',
      termSize: 100,
      aggField: '[aggField]',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [4.2],
    });
    const base: BaseActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      group: '[group]',
      value: 42,
      conditions: 'avg([aggField]) greater than 4.2',
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(`"alert [alert-name] group [group] met threshold"`);
    expect(context.message).toEqual(
      `alert '[alert-name]' is active for group '[group]':

- Value: 42
- Conditions Met: avg([aggField]) greater than 4.2 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z`
    );
  });

  it('generates expected properties if comparator is between', async () => {
    const params = ParamsSchema.validate({
      index: '[index]',
      timeField: '[timeField]',
      aggType: 'count',
      groupBy: 'top',
      termField: 'x',
      termSize: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: 'between',
      threshold: [4, 5],
    });
    const base: BaseActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      group: '[group]',
      value: 4,
      conditions: 'count between 4 and 5',
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(`"alert [alert-name] group [group] met threshold"`);
    expect(context.message).toEqual(
      `alert '[alert-name]' is active for group '[group]':

- Value: 4
- Conditions Met: count between 4 and 5 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z`
    );
  });

  it('generates expected properties if value is string', async () => {
    const params = ParamsSchema.validate({
      index: '[index]',
      timeField: '[timeField]',
      aggType: 'count',
      groupBy: 'top',
      termField: 'x',
      termSize: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: 'between',
      threshold: [4, 5],
    });
    const base: BaseActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      group: '[group]',
      value: 'unknown',
      conditions: 'count between 4 and 5',
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(`"alert [alert-name] group [group] met threshold"`);
    expect(context.message).toEqual(
      `alert '[alert-name]' is active for group '[group]':

- Value: unknown
- Conditions Met: count between 4 and 5 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z`
    );
  });
});
