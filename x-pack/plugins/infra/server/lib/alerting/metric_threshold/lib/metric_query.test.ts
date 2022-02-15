/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { getElasticsearchMetricQuery } from './metric_query';

describe("The Metric Threshold Alert's getElasticsearchMetricQuery", () => {
  const expressionParams = {
    metric: 'system.is.a.good.puppy.dog',
    aggType: 'avg',
    timeUnit: 'm',
    timeSize: 1,
  } as MetricExpressionParams;

  const groupBy = 'host.doggoname';
  const timeframe = {
    start: moment().subtract(5, 'minutes').valueOf(),
    end: moment().valueOf(),
  };

  describe('when passed no filterQuery', () => {
    const searchBody = getElasticsearchMetricQuery(expressionParams, timeframe, 100, groupBy);
    test('includes a range filter', () => {
      expect(
        searchBody.query.bool.filter.find((filter) => filter.hasOwnProperty('range'))
      ).toBeTruthy();
    });

    test('includes a metric field filter', () => {
      expect(searchBody.query.bool.filter).toMatchObject(
        expect.arrayContaining([{ exists: { field: 'system.is.a.good.puppy.dog' } }])
      );
    });
  });

  describe('when passed a filterQuery', () => {
    const filterQuery =
      // This is adapted from a real-world query that previously broke alerts
      // We want to make sure it doesn't override any existing filters
      '{"bool":{"filter":[{"bool":{"filter":[{"bool":{"must_not":[{"bool":{"should":[{"query_string":{"query":"bark*","fields":["host.name^1.0"],"type":"best_fields","default_operator":"or","max_determinized_states":10000,"enable_position_increments":true,"fuzziness":"AUTO","fuzzy_prefix_length":0,"fuzzy_max_expansions":50,"phrase_slop":0,"escape":false,"auto_generate_synonyms_phrase_query":true,"fuzzy_transpositions":true,"boost":1}}],"adjust_pure_negative":true,"minimum_should_match":"1","boost":1}}],"adjust_pure_negative":true,"boost":1}},{"bool":{"must_not":[{"bool":{"should":[{"query_string":{"query":"woof*","fields":["host.name^1.0"],"type":"best_fields","default_operator":"or","max_determinized_states":10000,"enable_position_increments":true,"fuzziness":"AUTO","fuzzy_prefix_length":0,"fuzzy_max_expansions":50,"phrase_slop":0,"escape":false,"auto_generate_synonyms_phrase_query":true,"fuzzy_transpositions":true,"boost":1}}],"adjust_pure_negative":true,"minimum_should_match":"1","boost":1}}],"adjust_pure_negative":true,"boost":1}}],"adjust_pure_negative":true,"boost":1}}],"adjust_pure_negative":true,"boost":1}}';

    const searchBody = getElasticsearchMetricQuery(
      expressionParams,
      timeframe,
      100,
      groupBy,
      filterQuery
    );
    test('includes a range filter', () => {
      expect(
        searchBody.query.bool.filter.find((filter) => filter.hasOwnProperty('range'))
      ).toBeTruthy();
    });

    test('includes a metric field filter', () => {
      expect(searchBody.query.bool.filter).toMatchObject(
        expect.arrayContaining([{ exists: { field: 'system.is.a.good.puppy.dog' } }])
      );
    });
  });
});
