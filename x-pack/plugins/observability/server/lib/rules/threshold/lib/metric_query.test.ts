/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Comparator,
  Aggregators,
  MetricExpressionParams,
} from '../../../../../common/threshold_rule/types';
import moment from 'moment';
import { getElasticsearchMetricQuery } from './metric_query';

describe("The Metric Threshold Alert's getElasticsearchMetricQuery", () => {
  const expressionParams: MetricExpressionParams = {
    metric: 'system.is.a.good.puppy.dog',
    aggType: Aggregators.AVERAGE,
    timeUnit: 'm',
    timeSize: 1,
    threshold: [1],
    comparator: Comparator.GT,
  };

  const groupBy = 'host.doggoname';
  const timeFieldName = 'mockedTimeFieldName';
  const timeframe = {
    start: moment().subtract(5, 'minutes').valueOf(),
    end: moment().valueOf(),
  };

  describe('when passed no filterQuery', () => {
    const searchBody = getElasticsearchMetricQuery(
      expressionParams,
      timeframe,
      timeFieldName,
      100,
      true,
      void 0,
      groupBy
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

  describe('when passed a filterQuery', () => {
    // This is adapted from a real-world query that previously broke alerts
    // We want to make sure it doesn't override any existing filters
    // https://github.com/elastic/kibana/issues/68492
    const filterQuery = 'NOT host.name:dv* and NOT host.name:ts*';

    const searchBody = getElasticsearchMetricQuery(
      expressionParams,
      timeframe,
      timeFieldName,
      100,
      true,
      void 0,
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
        expect.arrayContaining([
          { range: { mockedTimeFieldName: expect.any(Object) } },
          { exists: { field: 'system.is.a.good.puppy.dog' } },
          {
            bool: {
              filter: [
                {
                  bool: {
                    must_not: {
                      bool: {
                        should: [{ query_string: { fields: ['host.name'], query: 'dv*' } }],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
                {
                  bool: {
                    must_not: {
                      bool: {
                        should: [{ query_string: { fields: ['host.name'], query: 'ts*' } }],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
              ],
            },
          },
        ])
      );
    });
  });
});
