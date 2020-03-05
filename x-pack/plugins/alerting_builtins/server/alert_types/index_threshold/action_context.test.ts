/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseActionContext, addMessages } from './action_context';
import { ParamsSchema } from './alert_type_params';

describe('ActionContext', () => {
  it('generates expected properties if aggField is null', async () => {
    const base: BaseActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      group: '[group]',
      name: '[name]',
      spaceId: '[spaceId]',
      namespace: '[spaceId]',
      value: 42,
    };
    const params = ParamsSchema.validate({
      index: '[index]',
      timeField: '[timeField]',
      aggType: 'count',
      window: '5m',
      comparator: 'greaterThan',
      threshold: [4],
    });
    const context = addMessages(base, params);
    expect(context.subject).toMatchInlineSnapshot(
      `"alert [name] group [group] exceeded threshold"`
    );
    expect(context.message).toMatchInlineSnapshot(
      `"alert [name] group [group] value 42 exceeded threshold count greaterThan 4 over 5m on 2020-01-01T00:00:00.000Z"`
    );
  });

  it('generates expected properties if aggField is not null', async () => {
    const base: BaseActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      group: '[group]',
      name: '[name]',
      spaceId: '[spaceId]',
      namespace: '[spaceId]',
      value: 42,
    };
    const params = ParamsSchema.validate({
      index: '[index]',
      timeField: '[timeField]',
      aggType: 'average',
      aggField: '[aggField]',
      window: '5m',
      comparator: 'greaterThan',
      threshold: [4.2],
    });
    const context = addMessages(base, params);
    expect(context.subject).toMatchInlineSnapshot(
      `"alert [name] group [group] exceeded threshold"`
    );
    expect(context.message).toMatchInlineSnapshot(
      `"alert [name] group [group] value 42 exceeded threshold average([aggField]) greaterThan 4.2 over 5m on 2020-01-01T00:00:00.000Z"`
    );
  });

  it('generates expected properties if comparator is between', async () => {
    const base: BaseActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      group: '[group]',
      name: '[name]',
      spaceId: '[spaceId]',
      namespace: '[spaceId]',
      value: 4,
    };
    const params = ParamsSchema.validate({
      index: '[index]',
      timeField: '[timeField]',
      aggType: 'count',
      window: '5m',
      comparator: 'between',
      threshold: [4, 5],
    });
    const context = addMessages(base, params);
    expect(context.subject).toMatchInlineSnapshot(
      `"alert [name] group [group] exceeded threshold"`
    );
    expect(context.message).toMatchInlineSnapshot(
      `"alert [name] group [group] value 4 exceeded threshold count between 4,5 over 5m on 2020-01-01T00:00:00.000Z"`
    );
  });
});
