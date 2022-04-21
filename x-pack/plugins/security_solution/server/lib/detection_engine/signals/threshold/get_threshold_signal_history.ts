/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ThresholdSignalHistory } from '../types';
import { buildThresholdSignalHistory } from './build_signal_history';
import { IRuleDataReader } from '../../../../../../rule_registry/server';
import { createErrorsFromShard } from '../utils';

interface GetThresholdSignalHistoryParams {
  from: string;
  to: string;
  ruleId: string;
  bucketByFields: string[];
  ruleDataReader: IRuleDataReader;
}

export const getThresholdSignalHistory = async ({
  from,
  to,
  ruleId,
  bucketByFields,
  ruleDataReader,
}: GetThresholdSignalHistoryParams): Promise<{
  signalHistory: ThresholdSignalHistory;
  searchErrors: string[];
}> => {
  const request = buildPreviousThresholdAlertRequest({
    from,
    to,
    ruleId,
    bucketByFields,
  });

  const response = await ruleDataReader.search(request);
  return {
    signalHistory: buildThresholdSignalHistory({ alerts: response.hits.hits }),
    searchErrors: createErrorsFromShard({
      errors: response._shards.failures ?? [],
    }),
  };
};

export const buildPreviousThresholdAlertRequest = ({
  from,
  to,
  ruleId,
  bucketByFields,
}: {
  from: string;
  to: string;
  ruleId: string;
  bucketByFields: string[];
}): estypes.SearchRequest => {
  return {
    size: 10000,
    // We should switch over to @elastic/elasticsearch/lib/api/types instead of typesWithBodyKey where possible,
    // but api/types doesn't have a complete type for `sort`
    body: {
      sort: [
        {
          '@timestamp': 'desc',
        },
      ],
      query: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  lte: to,
                  gte: from,
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              term: {
                'signal.rule.rule_id': ruleId,
              },
            },
            // We might find a signal that was generated on the interval for old data... make sure to exclude those.
            {
              range: {
                'signal.original_time': {
                  gte: from,
                },
              },
            },
            ...bucketByFields.map((field) => {
              return {
                bool: {
                  should: [
                    {
                      term: {
                        'signal.rule.threshold.field': field,
                      },
                    },
                    {
                      term: {
                        'kibana.alert.rule.parameters.threshold.field': field,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              };
            }),
          ],
        },
      },
    },
  };
};
