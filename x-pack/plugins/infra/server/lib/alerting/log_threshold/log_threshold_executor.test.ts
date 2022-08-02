/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPositiveComparators,
  getNegativeComparators,
  queryMappings,
  buildFiltersFromCriteria,
  getUngroupedESQuery,
  getGroupedESQuery,
  processUngroupedResults,
  processGroupByResults,
} from './log_threshold_executor';
import {
  Comparator,
  RuleParams,
  Criterion,
  UngroupedSearchQueryResponse,
  GroupedSearchQueryResponse,
} from '../../../../common/alerting/logs/log_threshold';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

// Mocks //
const numericField = {
  field: 'numericField',
  value: 10,
};
const keywordField = {
  field: 'keywordField',
  value: 'error',
};

const textField = {
  field: 'textField',
  value: 'Something went wrong',
};

const positiveCriteria: Criterion[] = [
  { ...numericField, comparator: Comparator.GT },
  { ...numericField, comparator: Comparator.GT_OR_EQ },
  { ...numericField, comparator: Comparator.LT },
  { ...numericField, comparator: Comparator.LT_OR_EQ },
  { ...keywordField, comparator: Comparator.EQ },
  { ...textField, comparator: Comparator.MATCH },
  { ...textField, comparator: Comparator.MATCH_PHRASE },
];

const negativeCriteria: Criterion[] = [
  { ...keywordField, comparator: Comparator.NOT_EQ },
  { ...textField, comparator: Comparator.NOT_MATCH },
  { ...textField, comparator: Comparator.NOT_MATCH_PHRASE },
];

const expectedPositiveFilterClauses = [
  {
    range: {
      numericField: {
        gt: 10,
      },
    },
  },
  {
    range: {
      numericField: {
        gte: 10,
      },
    },
  },
  {
    range: {
      numericField: {
        lt: 10,
      },
    },
  },
  {
    range: {
      numericField: {
        lte: 10,
      },
    },
  },
  {
    term: {
      keywordField: {
        value: 'error',
      },
    },
  },
  {
    match: {
      textField: 'Something went wrong',
    },
  },
  {
    match_phrase: {
      textField: 'Something went wrong',
    },
  },
];

const expectedNegativeFilterClauses = [
  {
    term: {
      keywordField: {
        value: 'error',
      },
    },
  },
  {
    match: {
      textField: 'Something went wrong',
    },
  },
  {
    match_phrase: {
      textField: 'Something went wrong',
    },
  },
];

const baseRuleParams: Pick<RuleParams, 'count' | 'timeSize' | 'timeUnit'> = {
  count: {
    comparator: Comparator.GT,
    value: 5,
  },
  timeSize: 5,
  timeUnit: 'm',
};

const TIMESTAMP_FIELD = '@timestamp';
const FILEBEAT_INDEX = 'filebeat-*';
const EXECUTION_TIMESTAMP = new Date('2022-01-01T00:00:00.000Z').valueOf();

const runtimeMappings: estypes.MappingRuntimeFields = {
  runtime_field: {
    type: 'keyword',
    script: {
      lang: 'painless',
      source: 'emit("a runtime value")',
    },
  },
};

describe('Log threshold executor', () => {
  describe('Comparators', () => {
    test('Correctly categorises positive comparators', () => {
      expect(getPositiveComparators().length).toBe(7);
    });

    test('Correctly categorises negative comparators', () => {
      expect(getNegativeComparators().length).toBe(3);
    });

    test('There is a query mapping for every comparator', () => {
      const comparators = [...getPositiveComparators(), ...getNegativeComparators()];
      expect(Object.keys(queryMappings).length).toBe(comparators.length);
    });
  });
  describe('Criteria filter building', () => {
    test('Handles positive criteria', () => {
      const ruleParams: RuleParams = {
        ...baseRuleParams,
        criteria: positiveCriteria,
      };
      const filters = buildFiltersFromCriteria(ruleParams, TIMESTAMP_FIELD, EXECUTION_TIMESTAMP);
      expect(filters.mustFilters).toEqual(expectedPositiveFilterClauses);
    });

    test('Handles negative criteria', () => {
      const ruleParams: RuleParams = {
        ...baseRuleParams,
        criteria: negativeCriteria,
      };
      const filters = buildFiltersFromCriteria(ruleParams, TIMESTAMP_FIELD, EXECUTION_TIMESTAMP);

      expect(filters.mustNotFilters).toEqual(expectedNegativeFilterClauses);
    });

    test('Handles time range', () => {
      const ruleParams: RuleParams = { ...baseRuleParams, criteria: [] };
      const filters = buildFiltersFromCriteria(ruleParams, TIMESTAMP_FIELD, EXECUTION_TIMESTAMP);
      expect(typeof filters.rangeFilter.range[TIMESTAMP_FIELD].gte).toBe('number');
      expect(typeof filters.rangeFilter.range[TIMESTAMP_FIELD].lte).toBe('number');
      expect(filters.rangeFilter.range[TIMESTAMP_FIELD].format).toBe('epoch_millis');

      expect(typeof filters.groupedRangeFilter.range[TIMESTAMP_FIELD].gte).toBe('number');
      expect(typeof filters.groupedRangeFilter.range[TIMESTAMP_FIELD].lte).toBe('number');
      expect(filters.groupedRangeFilter.range[TIMESTAMP_FIELD].format).toBe('epoch_millis');
    });
  });

  describe('ES queries', () => {
    describe('Query generation', () => {
      it('Correctly generates ungrouped queries', () => {
        const ruleParams: RuleParams = {
          ...baseRuleParams,
          criteria: [...positiveCriteria, ...negativeCriteria],
        };
        const query = getUngroupedESQuery(
          ruleParams,
          TIMESTAMP_FIELD,
          FILEBEAT_INDEX,
          runtimeMappings,
          EXECUTION_TIMESTAMP
        );
        expect(query).toEqual({
          index: 'filebeat-*',
          allow_no_indices: true,
          ignore_unavailable: true,
          body: {
            track_total_hits: true,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: expect.any(Number),
                        lte: expect.any(Number),
                        format: 'epoch_millis',
                      },
                    },
                  },
                  ...expectedPositiveFilterClauses,
                ],
                must_not: [...expectedNegativeFilterClauses],
              },
            },
            runtime_mappings: {
              runtime_field: {
                type: 'keyword',
                script: {
                  lang: 'painless',
                  source: 'emit("a runtime value")',
                },
              },
            },
            size: 0,
          },
        });
      });

      describe('Correctly generates grouped queries', () => {
        it('When using an optimizable threshold comparator', () => {
          const ruleParams: RuleParams = {
            ...baseRuleParams,
            groupBy: ['host.name'],
            criteria: [...positiveCriteria, ...negativeCriteria],
          };
          const query = getGroupedESQuery(
            ruleParams,
            TIMESTAMP_FIELD,
            FILEBEAT_INDEX,
            runtimeMappings,
            EXECUTION_TIMESTAMP
          );

          expect(query).toEqual({
            index: 'filebeat-*',
            allow_no_indices: true,
            ignore_unavailable: true,
            body: {
              query: {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          gte: expect.any(Number),
                          lte: expect.any(Number),
                          format: 'epoch_millis',
                        },
                      },
                    },
                    ...expectedPositiveFilterClauses,
                  ],
                  must_not: [...expectedNegativeFilterClauses],
                },
              },
              aggregations: {
                groups: {
                  composite: {
                    size: 2000,
                    sources: [
                      {
                        'group-0-host.name': {
                          terms: {
                            field: 'host.name',
                          },
                        },
                      },
                    ],
                  },
                },
              },
              runtime_mappings: {
                runtime_field: {
                  type: 'keyword',
                  script: {
                    lang: 'painless',
                    source: 'emit("a runtime value")',
                  },
                },
              },
              size: 0,
            },
          });
        });

        it('When not using an optimizable threshold comparator', () => {
          const ruleParams: RuleParams = {
            ...baseRuleParams,
            count: {
              ...baseRuleParams.count,
              comparator: Comparator.LT,
            },
            groupBy: ['host.name'],
            criteria: [...positiveCriteria, ...negativeCriteria],
          };

          const query = getGroupedESQuery(
            ruleParams,
            TIMESTAMP_FIELD,
            FILEBEAT_INDEX,
            runtimeMappings,
            EXECUTION_TIMESTAMP
          );

          expect(query).toEqual({
            index: 'filebeat-*',
            allow_no_indices: true,
            ignore_unavailable: true,
            body: {
              query: {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          gte: expect.any(Number),
                          lte: expect.any(Number),
                          format: 'epoch_millis',
                        },
                      },
                    },
                  ],
                },
              },
              aggregations: {
                groups: {
                  composite: {
                    size: 2000,
                    sources: [
                      {
                        'group-0-host.name': {
                          terms: {
                            field: 'host.name',
                          },
                        },
                      },
                    ],
                  },
                  aggregations: {
                    filtered_results: {
                      filter: {
                        bool: {
                          filter: [
                            {
                              range: {
                                '@timestamp': {
                                  gte: expect.any(Number),
                                  lte: expect.any(Number),
                                  format: 'epoch_millis',
                                },
                              },
                            },
                            ...expectedPositiveFilterClauses,
                          ],
                          must_not: [...expectedNegativeFilterClauses],
                        },
                      },
                    },
                  },
                },
              },
              runtime_mappings: {
                runtime_field: {
                  type: 'keyword',
                  script: {
                    lang: 'painless',
                    source: 'emit("a runtime value")',
                  },
                },
              },
              size: 0,
            },
          });
        });
      });
    });
  });

  describe('Results processors', () => {
    describe('Can process ungrouped results', () => {
      test('It handles the ALERT state correctly', () => {
        const alertFactoryMock = jest.fn();
        const ruleParams = {
          ...baseRuleParams,
          criteria: [positiveCriteria[0]],
        };
        const results = {
          hits: {
            total: {
              value: 10,
            },
          },
        } as UngroupedSearchQueryResponse;

        processUngroupedResults(results, ruleParams, alertFactoryMock);

        // first call, fifth argument
        expect(alertFactoryMock.mock.calls[0][4]).toEqual([
          {
            actionGroup: 'logs.threshold.fired',
            context: {
              conditions: 'numericField more than 10',
              group: null,
              matchingDocuments: 10,
              isRatio: false,
              reason: '10 log entries in the last 5 mins. Alert when > 5.',
            },
          },
        ]);
      });
    });

    describe('Can process grouped results', () => {
      test('It handles the ALERT state correctly', () => {
        const alertFactoryMock = jest.fn();
        const ruleParams = {
          ...baseRuleParams,
          criteria: [positiveCriteria[0]],
          groupBy: ['host.name', 'event.dataset'],
        };
        // Two groups should fire, one shouldn't
        const results = [
          {
            key: {
              'host.name': 'i-am-a-host-name-1',
              'event.dataset': 'i-am-a-dataset-1',
            },
            doc_count: 100,
            filtered_results: {
              doc_count: 10,
            },
          },
          {
            key: {
              'host.name': 'i-am-a-host-name-2',
              'event.dataset': 'i-am-a-dataset-2',
            },
            doc_count: 100,
            filtered_results: {
              doc_count: 2,
            },
          },
          {
            key: {
              'host.name': 'i-am-a-host-name-3',
              'event.dataset': 'i-am-a-dataset-3',
            },
            doc_count: 100,
            filtered_results: {
              doc_count: 20,
            },
          },
        ] as GroupedSearchQueryResponse['aggregations']['groups']['buckets'];

        processGroupByResults(results, ruleParams, alertFactoryMock);
        expect(alertFactoryMock.mock.calls.length).toBe(2);

        // First call, fifth argument
        expect(alertFactoryMock.mock.calls[0][4]).toEqual([
          {
            actionGroup: 'logs.threshold.fired',
            context: {
              conditions: 'numericField more than 10',
              group: 'i-am-a-host-name-1, i-am-a-dataset-1',
              matchingDocuments: 10,
              isRatio: false,
              reason:
                '10 log entries in the last 5 mins for i-am-a-host-name-1, i-am-a-dataset-1. Alert when > 5.',
            },
          },
        ]);

        // Second call, fifth argument
        expect(alertFactoryMock.mock.calls[1][4]).toEqual([
          {
            actionGroup: 'logs.threshold.fired',
            context: {
              conditions: 'numericField more than 10',
              group: 'i-am-a-host-name-3, i-am-a-dataset-3',
              matchingDocuments: 20,
              isRatio: false,
              reason:
                '20 log entries in the last 5 mins for i-am-a-host-name-3, i-am-a-dataset-3. Alert when > 5.',
            },
          },
        ]);
      });
    });
  });
});
