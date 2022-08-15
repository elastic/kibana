/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { sampleEmptyDocSearchResults } from '../__mocks__/es_results';
import * as single_search_after from '../single_search_after';
import { findThresholdSignals } from './find_threshold_signals';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { buildTimestampRuntimeMapping } from '../../rule_types/utils';
import { TIMESTAMP_RUNTIME_FIELD } from '../../rule_types/constants';

const queryFilter = getQueryFilter('', 'kuery', [], ['*'], []);
const mockSingleSearchAfter = jest.fn(async () => ({
  searchResult: {
    ...sampleEmptyDocSearchResults(),
    aggregations: {
      thresholdTerms: {
        buckets: [],
      },
    },
  },
  searchDuration: '0.0',
  searchErrors: [],
}));

describe('findThresholdSignals', () => {
  let mockService: RuleExecutorServicesMock;
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(single_search_after, 'singleSearchAfter').mockImplementation(mockSingleSearchAfter);
    mockService = alertsMock.createRuleExecutorServices();
  });

  it('should generate a threshold signal query when only a value is provided', async () => {
    await findThresholdSignals({
      from: 'now-6m',
      to: 'now',
      maxSignals: 100,
      inputIndexPattern: ['*'],
      services: mockService,
      ruleExecutionLogger,
      filter: queryFilter,
      threshold: {
        field: [],
        value: 100,
      },
      runtimeMappings: undefined,
      primaryTimestamp: TIMESTAMP,
      secondaryTimestamp: undefined,
      aggregatableTimestampField: TIMESTAMP,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          max_timestamp: {
            max: {
              field: '@timestamp',
            },
          },
          min_timestamp: {
            min: {
              field: '@timestamp',
            },
          },
        },
      })
    );
  });

  it('should generate a threshold signal query when a field and value are provided', async () => {
    await findThresholdSignals({
      from: 'now-6m',
      to: 'now',
      maxSignals: 100,
      inputIndexPattern: ['*'],
      services: mockService,
      ruleExecutionLogger,
      filter: queryFilter,
      threshold: {
        field: ['host.name'],
        value: 100,
      },
      runtimeMappings: undefined,
      primaryTimestamp: TIMESTAMP,
      secondaryTimestamp: undefined,
      aggregatableTimestampField: TIMESTAMP,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          thresholdTerms: {
            composite: {
              size: 10000,
              after: undefined,
              sources: [
                {
                  'host.name': {
                    terms: {
                      field: 'host.name',
                    },
                  },
                },
              ],
            },
            aggs: {
              max_timestamp: {
                max: {
                  field: '@timestamp',
                },
              },
              min_timestamp: {
                min: {
                  field: '@timestamp',
                },
              },
              count_check: {
                bucket_selector: {
                  buckets_path: {
                    docCount: '_count',
                  },
                  script: `params.docCount >= 100`,
                },
              },
            },
          },
        },
      })
    );
  });

  it('should generate a threshold signal query when multiple fields and a value are provided', async () => {
    await findThresholdSignals({
      from: 'now-6m',
      to: 'now',
      maxSignals: 100,
      inputIndexPattern: ['*'],
      services: mockService,
      ruleExecutionLogger,
      filter: queryFilter,
      threshold: {
        field: ['host.name', 'user.name'],
        value: 100,
        cardinality: [],
      },
      runtimeMappings: undefined,
      primaryTimestamp: TIMESTAMP,
      secondaryTimestamp: undefined,
      aggregatableTimestampField: TIMESTAMP,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          thresholdTerms: {
            composite: {
              size: 10000,
              after: undefined,
              sources: [
                {
                  'host.name': {
                    terms: {
                      field: 'host.name',
                    },
                  },
                },
                {
                  'user.name': {
                    terms: {
                      field: 'user.name',
                    },
                  },
                },
              ],
            },
            aggs: {
              max_timestamp: {
                max: {
                  field: '@timestamp',
                },
              },
              min_timestamp: {
                min: {
                  field: '@timestamp',
                },
              },
              count_check: {
                bucket_selector: {
                  buckets_path: {
                    docCount: '_count',
                  },
                  script: `params.docCount >= 100`,
                },
              },
            },
          },
        },
      })
    );
  });

  it('should generate a threshold signal query when multiple fields, a value, and cardinality field/value are provided', async () => {
    await findThresholdSignals({
      from: 'now-6m',
      to: 'now',
      maxSignals: 100,
      inputIndexPattern: ['*'],
      services: mockService,
      ruleExecutionLogger,
      filter: queryFilter,
      threshold: {
        field: ['host.name', 'user.name'],
        value: 100,
        cardinality: [
          {
            field: 'destination.ip',
            value: 2,
          },
        ],
      },
      runtimeMappings: undefined,
      primaryTimestamp: TIMESTAMP,
      secondaryTimestamp: undefined,
      aggregatableTimestampField: TIMESTAMP,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          thresholdTerms: {
            composite: {
              size: 10000,
              after: undefined,
              sources: [
                {
                  'host.name': {
                    terms: {
                      field: 'host.name',
                    },
                  },
                },
                {
                  'user.name': {
                    terms: {
                      field: 'user.name',
                    },
                  },
                },
              ],
            },
            aggs: {
              max_timestamp: {
                max: {
                  field: '@timestamp',
                },
              },
              min_timestamp: {
                min: {
                  field: '@timestamp',
                },
              },
              count_check: {
                bucket_selector: {
                  buckets_path: {
                    docCount: '_count',
                  },
                  script: `params.docCount >= 100`,
                },
              },
              cardinality_count: {
                cardinality: {
                  field: 'destination.ip',
                },
              },
              cardinality_check: {
                bucket_selector: {
                  buckets_path: {
                    cardinalityCount: 'cardinality_count',
                  },
                  script: 'params.cardinalityCount >= 2',
                },
              },
            },
          },
        },
      })
    );
  });

  it('should generate a threshold signal query when only a value and a cardinality field/value are provided', async () => {
    await findThresholdSignals({
      from: 'now-6m',
      to: 'now',
      maxSignals: 100,
      inputIndexPattern: ['*'],
      services: mockService,
      ruleExecutionLogger,
      filter: queryFilter,
      threshold: {
        cardinality: [
          {
            field: 'source.ip',
            value: 5,
          },
        ],
        field: [],
        value: 200,
      },
      runtimeMappings: undefined,
      primaryTimestamp: TIMESTAMP,
      secondaryTimestamp: undefined,
      aggregatableTimestampField: TIMESTAMP,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          cardinality_count: {
            cardinality: {
              field: 'source.ip',
            },
          },
          max_timestamp: {
            max: {
              field: '@timestamp',
            },
          },
          min_timestamp: {
            min: {
              field: '@timestamp',
            },
          },
        },
      })
    );
  });

  it('should generate a threshold signal query with timestamp override', async () => {
    const timestampOverride = 'event.ingested';
    const { aggregatableTimestampField, timestampRuntimeMappings } = {
      aggregatableTimestampField: TIMESTAMP_RUNTIME_FIELD,
      timestampRuntimeMappings: buildTimestampRuntimeMapping({
        timestampOverride,
      }),
    };

    await findThresholdSignals({
      from: 'now-6m',
      to: 'now',
      maxSignals: 100,
      inputIndexPattern: ['*'],
      services: mockService,
      ruleExecutionLogger,
      filter: queryFilter,
      threshold: {
        cardinality: [
          {
            field: 'source.ip',
            value: 5,
          },
        ],
        field: [],
        value: 200,
      },
      runtimeMappings: timestampRuntimeMappings,
      primaryTimestamp: timestampOverride,
      secondaryTimestamp: TIMESTAMP,
      aggregatableTimestampField,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryTimestamp: timestampOverride,
        secondaryTimestamp: TIMESTAMP,
        runtimeMappings: buildTimestampRuntimeMapping({ timestampOverride }),
        aggregations: {
          cardinality_count: {
            cardinality: {
              field: 'source.ip',
            },
          },
          max_timestamp: {
            max: {
              field: TIMESTAMP_RUNTIME_FIELD,
            },
          },
          min_timestamp: {
            min: {
              field: TIMESTAMP_RUNTIME_FIELD,
            },
          },
        },
      })
    );
  });
});
