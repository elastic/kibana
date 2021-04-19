/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMock, AlertServicesMock } from '../../../../../../alerting/server/mocks';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { mockLogger } from '../__mocks__/es_results';
import { buildRuleMessageFactory } from '../rule_messages';
import * as single_search_after from '../single_search_after';
import { findThresholdSignals } from './find_threshold_signals';

const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});

const queryFilter = getQueryFilter('', 'kuery', [], ['*'], []);
const mockSingleSearchAfter = jest.fn();

describe('findThresholdSignals', () => {
  let mockService: AlertServicesMock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(single_search_after, 'singleSearchAfter').mockImplementation(mockSingleSearchAfter);
    mockService = alertsMock.createAlertServices();
  });

  it('should generate a threshold signal query when only a value is provided', async () => {
    await findThresholdSignals({
      from: 'now-6m',
      to: 'now',
      inputIndexPattern: ['*'],
      services: mockService,
      logger: mockLogger,
      filter: queryFilter,
      threshold: {
        field: [],
        value: 100,
      },
      buildRuleMessage,
      timestampOverride: undefined,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          threshold_0: {
            terms: {
              script: {
                source: '""',
                lang: 'painless',
              },
              min_doc_count: 100,
            },
            aggs: {
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
                },
              },
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
      inputIndexPattern: ['*'],
      services: mockService,
      logger: mockLogger,
      filter: queryFilter,
      threshold: {
        field: ['host.name'],
        value: 100,
      },
      buildRuleMessage,
      timestampOverride: undefined,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          'threshold_0:host.name': {
            terms: {
              field: 'host.name',
              min_doc_count: 100,
              size: 10000,
            },
            aggs: {
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
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
      inputIndexPattern: ['*'],
      services: mockService,
      logger: mockLogger,
      filter: queryFilter,
      threshold: {
        field: ['host.name', 'user.name'],
        value: 100,
        cardinality: [],
      },
      buildRuleMessage,
      timestampOverride: undefined,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          'threshold_0:host.name': {
            terms: {
              field: 'host.name',
              min_doc_count: 100,
              size: 10000,
            },
            aggs: {
              'threshold_1:user.name': {
                terms: {
                  field: 'user.name',
                  min_doc_count: 100,
                  size: 10000,
                },
                aggs: {
                  top_threshold_hits: {
                    top_hits: {
                      sort: [
                        {
                          '@timestamp': {
                            order: 'desc',
                          },
                        },
                      ],
                      fields: [
                        {
                          field: '*',
                          include_unmapped: true,
                        },
                      ],
                      size: 1,
                    },
                  },
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
      inputIndexPattern: ['*'],
      services: mockService,
      logger: mockLogger,
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
      buildRuleMessage,
      timestampOverride: undefined,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          'threshold_0:host.name': {
            terms: {
              field: 'host.name',
              min_doc_count: 100,
              size: 10000,
            },
            aggs: {
              'threshold_1:user.name': {
                terms: {
                  field: 'user.name',
                  min_doc_count: 100,
                  size: 10000,
                },
                aggs: {
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
                  top_threshold_hits: {
                    top_hits: {
                      sort: [
                        {
                          '@timestamp': {
                            order: 'desc',
                          },
                        },
                      ],
                      fields: [
                        {
                          field: '*',
                          include_unmapped: true,
                        },
                      ],
                      size: 1,
                    },
                  },
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
      inputIndexPattern: ['*'],
      services: mockService,
      logger: mockLogger,
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
      buildRuleMessage,
      timestampOverride: undefined,
    });
    expect(mockSingleSearchAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          threshold_0: {
            terms: {
              script: {
                source: '""',
                lang: 'painless',
              },
              min_doc_count: 200,
            },
            aggs: {
              cardinality_count: {
                cardinality: {
                  field: 'source.ip',
                },
              },
              cardinality_check: {
                bucket_selector: {
                  buckets_path: {
                    cardinalityCount: 'cardinality_count',
                  },
                  script: 'params.cardinalityCount >= 5',
                },
              },
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
                },
              },
            },
          },
        },
      })
    );
  });
});
