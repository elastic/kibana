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
  AlertStates,
  AlertParams,
  Criterion,
  UngroupedSearchQueryResponse,
  GroupedSearchQueryResponse,
} from '../../../../common/alerting/logs/log_threshold/types';
import { alertsMock } from '../../../../../alerting/server/mocks';
import type { estypes } from '@elastic/elasticsearch';

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

const baseAlertParams: Pick<AlertParams, 'count' | 'timeSize' | 'timeUnit'> = {
  count: {
    comparator: Comparator.GT,
    value: 5,
  },
  timeSize: 5,
  timeUnit: 'm',
};

const TIMESTAMP_FIELD = '@timestamp';
const FILEBEAT_INDEX = 'filebeat-*';

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
      const alertParams: AlertParams = {
        ...baseAlertParams,
        criteria: positiveCriteria,
      };
      const filters = buildFiltersFromCriteria(alertParams, TIMESTAMP_FIELD);
      expect(filters.mustFilters).toEqual([
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
      ]);
    });

    test('Handles negative criteria', () => {
      const alertParams: AlertParams = {
        ...baseAlertParams,
        criteria: negativeCriteria,
      };
      const filters = buildFiltersFromCriteria(alertParams, TIMESTAMP_FIELD);

      expect(filters.mustNotFilters).toEqual([
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
      ]);
    });

    test('Handles time range', () => {
      const alertParams: AlertParams = { ...baseAlertParams, criteria: [] };
      const filters = buildFiltersFromCriteria(alertParams, TIMESTAMP_FIELD);
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
      test('Correctly generates ungrouped queries', () => {
        const alertParams: AlertParams = {
          ...baseAlertParams,
          criteria: [...positiveCriteria, ...negativeCriteria],
        };
        const query = getUngroupedESQuery(
          alertParams,
          TIMESTAMP_FIELD,
          FILEBEAT_INDEX,
          runtimeMappings
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
                ],
                must_not: [
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
                ],
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

      test('Correctly generates grouped queries', () => {
        const alertParams: AlertParams = {
          ...baseAlertParams,
          groupBy: ['host.name'],
          criteria: [...positiveCriteria, ...negativeCriteria],
        };
        const query = getGroupedESQuery(
          alertParams,
          TIMESTAMP_FIELD,
          FILEBEAT_INDEX,
          runtimeMappings
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
                  size: 40,
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
                        ],
                        must_not: [
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
                        ],
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

  describe('Results processors', () => {
    describe('Can process ungrouped results', () => {
      test('It handles the ALERT state correctly', () => {
        const alertInstanceUpdaterMock = jest.fn();
        const alertParams = {
          ...baseAlertParams,
          criteria: [positiveCriteria[0]],
        };
        const results = {
          hits: {
            total: {
              value: 10,
            },
          },
        } as UngroupedSearchQueryResponse;
        processUngroupedResults(
          results,
          alertParams,
          alertsMock.createAlertInstanceFactory,
          alertInstanceUpdaterMock
        );
        // First call, second argument
        expect(alertInstanceUpdaterMock.mock.calls[0][1]).toBe(AlertStates.ALERT);
        // First call, third argument
        expect(alertInstanceUpdaterMock.mock.calls[0][2]).toEqual([
          {
            actionGroup: 'logs.threshold.fired',
            context: {
              conditions: ' numericField more than 10',
              group: null,
              matchingDocuments: 10,
              isRatio: false,
            },
          },
        ]);
      });
    });

    describe('Can process grouped results', () => {
      test('It handles the ALERT state correctly', () => {
        const alertInstanceUpdaterMock = jest.fn();
        const alertParams = {
          ...baseAlertParams,
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
        processGroupByResults(
          results,
          alertParams,
          alertsMock.createAlertInstanceFactory,
          alertInstanceUpdaterMock
        );
        expect(alertInstanceUpdaterMock.mock.calls.length).toBe(2);
        // First call, second argument
        expect(alertInstanceUpdaterMock.mock.calls[0][1]).toBe(AlertStates.ALERT);
        // First call, third argument
        expect(alertInstanceUpdaterMock.mock.calls[0][2]).toEqual([
          {
            actionGroup: 'logs.threshold.fired',
            context: {
              conditions: ' numericField more than 10',
              group: 'i-am-a-host-name-1, i-am-a-dataset-1',
              matchingDocuments: 10,
              isRatio: false,
            },
          },
        ]);

        // Second call, second argument
        expect(alertInstanceUpdaterMock.mock.calls[1][1]).toBe(AlertStates.ALERT);
        // Second call, third argument
        expect(alertInstanceUpdaterMock.mock.calls[1][2]).toEqual([
          {
            actionGroup: 'logs.threshold.fired',
            context: {
              conditions: ' numericField more than 10',
              group: 'i-am-a-host-name-3, i-am-a-dataset-3',
              matchingDocuments: 20,
              isRatio: false,
            },
          },
        ]);
      });
    });
  });
});
