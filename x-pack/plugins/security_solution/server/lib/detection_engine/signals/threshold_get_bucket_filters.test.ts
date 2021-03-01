/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';
import { mockLogger, sampleWrappedThresholdSignalHit } from './__mocks__/es_results';
import { getThresholdBucketFilters } from './threshold_get_bucket_filters';
import { buildRuleMessageFactory } from './rule_messages';

const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});

describe('thresholdGetBucketFilters', () => {
  let mockService: AlertServicesMock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = alertsMock.createAlertServices();
  });

  it('should generate filters for threshold signal detection with dupe mitigation', async () => {
    mockService.callCluster.mockResolvedValue({
      took: 10,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: 1,
        max_score: 100,
        hits: [sampleWrappedThresholdSignalHit()],
      },
    });
    const result = await getThresholdBucketFilters({
      from: 'now-6m',
      to: 'now',
      indexPattern: ['*'],
      services: mockService,
      logger: mockLogger,
      ruleId: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
      bucketByFields: ['host.name'],
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(result).toEqual({
      filters: [
        {
          bool: {
            must_not: [
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          lte: '2021-02-16T17:37:34.275Z',
                        },
                      },
                    },
                    {
                      term: {
                        'host.name': 'a hostname',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
      searchErrors: [],
    });
  });
});
