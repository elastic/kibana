/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EsQueryRuleActionContext,
  addMessages,
  getContextConditionsDescription,
} from './action_context';
import { EsQueryRuleParams, EsQueryRuleParamsSchema } from './rule_type_params';
import { Comparator } from '../../../common/comparator_types';

describe('addMessages', () => {
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
      aggType: 'count',
      groupBy: 'all',
    }) as EsQueryRuleParams;
    const base: EsQueryRuleActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 42,
      conditions: 'count greater than 4',
      hits: [],
      link: 'link-mock',
    };
    const context = addMessages({ ruleName: '[rule-name]', baseContext: base, params });
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
      aggType: 'count',
      groupBy: 'all',
    }) as EsQueryRuleParams;
    const base: EsQueryRuleActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 42,
      conditions: 'count not greater than 4',
      hits: [],
      link: 'link-mock',
    };
    const context = addMessages({
      ruleName: '[rule-name]',
      baseContext: base,
      params,
      isRecovered: true,
    });
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
      aggType: 'count',
      groupBy: 'all',
    }) as EsQueryRuleParams;
    const base: EsQueryRuleActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 4,
      conditions: 'count between 4 and 5',
      hits: [],
      link: 'link-mock',
    };
    const context = addMessages({ ruleName: '[rule-name]', baseContext: base, params });
    expect(context.title).toMatchInlineSnapshot(`"rule '[rule-name]' matched query"`);
    expect(context.message).toEqual(
      `rule '[rule-name]' is active:

- Value: 4
- Conditions Met: count between 4 and 5 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z
- Link: link-mock`
    );
  });

  it('generates expected properties when group is specified', async () => {
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
      aggType: 'count',
      groupBy: 'top',
      termField: 'host.name',
      termSize: 5,
    }) as EsQueryRuleParams;
    const base: EsQueryRuleActionContext = {
      date: '2020-01-01T00:00:00.000Z',
      value: 42,
      conditions: `count for group "host-1" not greater than 4`,
      hits: [],
      link: 'link-mock',
    };
    const context = addMessages({
      ruleName: '[rule-name]',
      baseContext: base,
      params,
      group: 'host-1',
    });
    expect(context.title).toMatchInlineSnapshot(
      `"rule '[rule-name]' matched query for group host-1"`
    );
    expect(context.message).toEqual(
      `rule '[rule-name]' is active:

- Value: 42
- Conditions Met: count for group "host-1" not greater than 4 over 5m
- Timestamp: 2020-01-01T00:00:00.000Z
- Link: link-mock`
    );
  });
});

describe('getContextConditionsDescription', () => {
  it('should return conditions correctly', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      aggType: 'count',
    });
    expect(result).toBe(`Number of matching documents is greater than 10`);
  });

  it('should return conditions correctly when isRecovered is true', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      aggType: 'count',
      isRecovered: true,
    });
    expect(result).toBe(`Number of matching documents is NOT greater than 10`);
  });

  it('should return conditions correctly when multiple thresholds provided', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.BETWEEN,
      threshold: [10, 20],
      aggType: 'count',
      isRecovered: true,
    });
    expect(result).toBe(`Number of matching documents is NOT between 10 and 20`);
  });

  it('should return conditions correctly when group is specified', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      aggType: 'count',
      group: 'host-1',
    });
    expect(result).toBe(`Number of matching documents for group "host-1" is greater than 10`);
  });

  it('should return conditions correctly when group is specified and isRecovered is true', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      aggType: 'count',
      isRecovered: true,
      group: 'host-1',
    });
    expect(result).toBe(`Number of matching documents for group "host-1" is NOT greater than 10`);
  });

  it('should return conditions correctly when aggType is not count', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      aggType: 'min',
      aggField: 'numericField',
    });
    expect(result).toBe(
      `Number of matching documents where min of numericField is greater than 10`
    );
  });

  it('should return conditions correctly when aggType is not count and isRecovered is true', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      aggType: 'min',
      aggField: 'numericField',
      isRecovered: true,
    });
    expect(result).toBe(
      `Number of matching documents where min of numericField is NOT greater than 10`
    );
  });

  it('should return conditions correctly when group is specified and aggType is not count', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      group: 'host-1',
      aggType: 'max',
      aggField: 'numericField',
    });
    expect(result).toBe(
      `Number of matching documents for group "host-1" where max of numericField is greater than 10`
    );
  });

  it('should return conditions correctly when group is specified, aggType is not count and isRecovered is true', () => {
    const result = getContextConditionsDescription({
      comparator: Comparator.GT,
      threshold: [10],
      isRecovered: true,
      group: 'host-1',
      aggType: 'max',
      aggField: 'numericField',
    });
    expect(result).toBe(
      `Number of matching documents for group "host-1" where max of numericField is NOT greater than 10`
    );
  });
});
