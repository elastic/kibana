/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsCountQuery } from './helpers';

const stackByField0 = 'kibana.alert.rule.name';
const stackByField1 = 'host.name';
const from = '2022-07-08T06:00:00.000Z';
const to = '2022-07-09T05:59:59.999Z';
const additionalFilters = [
  {
    bool: {
      must: [],
      filter: [
        {
          term: {
            'kibana.alert.workflow_status': 'open',
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
];
const runtimeMappings = {};

describe('helpers', () => {
  describe('getAlertsCountQuery', () => {
    test('it returns the expected query when stackByField1 is specified', () => {
      expect(
        getAlertsCountQuery({
          additionalFilters,
          from,
          runtimeMappings,
          stackByField0,
          stackByField1,
          to,
        })
      ).toEqual({
        size: 0,
        aggs: {
          stackByField0: {
            terms: { field: 'kibana.alert.rule.name', order: { _count: 'desc' }, size: 1000 },
            aggs: {
              stackByField1: {
                terms: { field: 'host.name', order: { _count: 'desc' }, size: 1000 },
              },
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [],
                  filter: [{ term: { 'kibana.alert.workflow_status': 'open' } }],
                  should: [],
                  must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2022-07-08T06:00:00.000Z',
                    lte: '2022-07-09T05:59:59.999Z',
                  },
                },
              },
            ],
          },
        },
        runtime_mappings: {},
      });
    });

    test('it returns the expected query when stackByField1 is `undefined`', () => {
      expect(
        getAlertsCountQuery({
          additionalFilters,
          from,
          runtimeMappings,
          stackByField0,
          stackByField1: undefined,
          to,
        })
      ).toEqual({
        size: 0,
        aggs: {
          stackByField0: {
            terms: { field: 'kibana.alert.rule.name', order: { _count: 'desc' }, size: 1000 },
            aggs: {},
          },
        },
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [],
                  filter: [{ term: { 'kibana.alert.workflow_status': 'open' } }],
                  should: [],
                  must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2022-07-08T06:00:00.000Z',
                    lte: '2022-07-09T05:59:59.999Z',
                  },
                },
              },
            ],
          },
        },
        runtime_mappings: {},
      });
    });
  });
});
