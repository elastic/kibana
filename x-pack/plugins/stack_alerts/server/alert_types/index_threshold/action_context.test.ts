/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      conditions: 'count > 4',
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(
      `"alert [alert-name] group [group] exceeded threshold"`
    );
    expect(context.message).toMatchInlineSnapshot(
      `"alert [alert-name] group [group] value 42 exceeded threshold count > 4 over 5m on 2020-01-01T00:00:00.000Z"`
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
      conditions: 'avg([aggField]) > 4.2',
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(
      `"alert [alert-name] group [group] exceeded threshold"`
    );
    expect(context.message).toMatchInlineSnapshot(
      `"alert [alert-name] group [group] value 42 exceeded threshold avg([aggField]) > 4.2 over 5m on 2020-01-01T00:00:00.000Z"`
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
      conditions: 'count between 4,5',
    };
    const context = addMessages({ name: '[alert-name]' }, base, params);
    expect(context.title).toMatchInlineSnapshot(
      `"alert [alert-name] group [group] exceeded threshold"`
    );
    expect(context.message).toMatchInlineSnapshot(
      `"alert [alert-name] group [group] value 4 exceeded threshold count between 4,5 over 5m on 2020-01-01T00:00:00.000Z"`
    );
  });
});
