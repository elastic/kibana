/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsGroupingQuery } from '.';
import { getQuery } from './mock';

let sampleData = {
  from: '2022-12-29T22:57:34.029Z',
  to: '2023-01-28T22:57:29.029Z',
  pageIndex: 0,
  pageSize: 25,
  runtimeMappings: {},
  uniqueValue: 'aSuperUniqueValue',
  selectedGroup: 'kibana.alert.rule.name',
  additionalFilters: [{ bool: { filter: [], must: [], must_not: [], should: [] } }],
};

describe('getAlertsGroupingQuery', () => {
  it('returns query with aggregations for kibana.alert.rule.name', () => {
    const groupingQuery = getAlertsGroupingQuery(sampleData);
    expect(groupingQuery).toStrictEqual(
      getQuery(sampleData.selectedGroup, sampleData.uniqueValue, {
        from: sampleData.from,
        to: sampleData.to,
      })
    );
  });
  it('returns default query with aggregations if the field specific metrics was not defined', () => {
    sampleData = {
      ...sampleData,
      selectedGroup: 'process.name',
    };
    const groupingQuery = getAlertsGroupingQuery(sampleData);
    const expectedResult = getQuery(sampleData.selectedGroup, sampleData.uniqueValue, {
      from: sampleData.from,
      to: sampleData.to,
    });

    const { unitsCount, bucket_truncate: bucketTruncate } = expectedResult.aggs.groupByFields.aggs;

    expect(groupingQuery).toStrictEqual({
      ...expectedResult,
      aggs: {
        ...expectedResult.aggs,
        groupByFields: {
          ...expectedResult.aggs.groupByFields,
          aggs: {
            bucket_truncate: bucketTruncate,
            unitsCount,
            rulesCountAggregation: { cardinality: { field: 'kibana.alert.rule.rule_id' } },
          },
        },
      },
    });
  });
});
