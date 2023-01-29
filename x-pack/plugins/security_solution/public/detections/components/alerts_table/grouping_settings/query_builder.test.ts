/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsGroupingQuery } from '.';

describe('getAlertsGroupingQuery', () => {
  it('returns query with aggregations for kibana.alert.rule.name', () => {
    const groupingQuery = getAlertsGroupingQuery({
      from: '2022-12-29T22:57:34.029Z',
      to: '2023-01-28T22:57:29.029Z',
      pageIndex: 0,
      pageSize: 25,
      runtimeMappings: {},
      selectedGroup: 'kibana.alert.rule.name',
      additionalFilters: [
        {
          bool: {
            must: [],
            filter: [
              {
                match_phrase: {
                  'kibana.alert.workflow_status': 'acknowledged',
                },
              },
            ],
            should: [],
            must_not: [
              {
                exists: {
                  field: 'kibana.alert.building_block_type',
                },
              },
            ],
          },
        },
      ],
    });

    expect(groupingQuery).toBe({});
  });

  it('returns default query with aggregations if the field specific metrics was not defined', () => {
    const groupingQuery = getAlertsGroupingQuery({
      from: '2022-12-29T22:57:34.029Z',
      to: '2023-01-28T22:57:29.029Z',
      pageIndex: 0,
      pageSize: 25,
      runtimeMappings: {},
      selectedGroup: 'process.name',
      additionalFilters: [
        {
          bool: {
            must: [],
            filter: [
              {
                match_phrase: {
                  'kibana.alert.workflow_status': 'acknowledged',
                },
              },
            ],
            should: [],
            must_not: [
              {
                exists: {
                  field: 'kibana.alert.building_block_type',
                },
              },
            ],
          },
        },
      ],
    });

    expect(groupingQuery).toBe({});
  });
});
