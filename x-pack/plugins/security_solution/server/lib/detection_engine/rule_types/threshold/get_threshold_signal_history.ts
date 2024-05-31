/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ThresholdSignalHistory } from './types';
import { buildThresholdSignalHistory } from './build_signal_history';
import { createErrorsFromShard } from '../utils/utils';

interface GetThresholdSignalHistoryParams {
  from: string;
  to: string;
  frameworkRuleId: string;
  bucketByFields: string[];
  spaceId: string;
  ruleDataClient: IRuleDataClient;
  esClient: ElasticsearchClient;
}

export const getThresholdSignalHistory = async ({
  from,
  to,
  frameworkRuleId,
  bucketByFields,
  spaceId,
  ruleDataClient,
  esClient,
}: GetThresholdSignalHistoryParams): Promise<{
  signalHistory: ThresholdSignalHistory;
  searchErrors: string[];
}> => {
  const request = buildPreviousThresholdAlertRequest({
    from,
    to,
    frameworkRuleId,
    bucketByFields,
  });

  const indexPattern = ruleDataClient?.indexNameWithNamespace(spaceId);
  const response = await esClient.search({
    ...request,
    index: indexPattern,
  });
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
  frameworkRuleId,
  bucketByFields,
}: {
  from: string;
  to: string;
  frameworkRuleId: string;
  bucketByFields: string[];
}): estypes.SearchRequest => {
  return {
    // We should switch over to @elastic/elasticsearch/lib/api/types instead of typesWithBodyKey where possible,
    // but api/types doesn't have a complete type for `sort`
    body: {
      size: 10000,
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
                [ALERT_RULE_UUID]: frameworkRuleId,
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
