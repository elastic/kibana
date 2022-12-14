/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryRuleActionContext, addMessages } from './action_context';
import { EsQueryRuleParams, EsQueryRuleParamsSchema } from './rule_type_params';

describe('ActionContext', () => {
  it('generates expected properties', async () => {
    const params = EsQueryRuleParamsSchema.validate({
      index: ['[index]'],
      timeField: '[timeField]',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [4],
      searchType: 'esQuery',
    }) as EsQueryRuleParams;
    const base: EsQueryRuleActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 42,
      conditions: 'count greater than 4',
      hits: [],
      link: 'link-mock',
    };
    const context = addMessages('[rule-name]', base, params);
    expect(context.title).toMatchInlineSnapshot(`"rule '[rule-name]' matched query"`);
    expect(context.message).toEqual(
      `rule '[rule-name]' is active:

- Value: 42
- Conditions Met: count greater than 4 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z
- Link: link-mock`
    );
  });

  it('generates expected properties when isRecovered is true', async () => {
    const params = EsQueryRuleParamsSchema.validate({
      index: ['[index]'],
      timeField: '[timeField]',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [4],
      searchType: 'esQuery',
    }) as EsQueryRuleParams;
    const base: EsQueryRuleActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 42,
      conditions: 'count not greater than 4',
      hits: [],
      link: 'link-mock',
    };
    const context = addMessages('[rule-name]', base, params, true);
    expect(context.title).toMatchInlineSnapshot(`"rule '[rule-name]' recovered"`);
    expect(context.message).toEqual(
      `rule '[rule-name]' is recovered:

- Value: 42
- Conditions Met: count not greater than 4 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z
- Link: link-mock`
    );
  });

  it('generates expected properties if comparator is between', async () => {
    const params = EsQueryRuleParamsSchema.validate({
      index: ['[index]'],
      timeField: '[timeField]',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: 'between',
      threshold: [4, 5],
      searchType: 'esQuery',
    }) as EsQueryRuleParams;
    const base: EsQueryRuleActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 4,
      conditions: 'count between 4 and 5',
      hits: [],
      link: 'link-mock',
    };
    const context = addMessages('[rule-name]', base, params);
    expect(context.title).toMatchInlineSnapshot(`"rule '[rule-name]' matched query"`);
    expect(context.message).toEqual(
      `rule '[rule-name]' is active:

- Value: 4
- Conditions Met: count between 4 and 5 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z
- Link: link-mock`
    );
  });
});
