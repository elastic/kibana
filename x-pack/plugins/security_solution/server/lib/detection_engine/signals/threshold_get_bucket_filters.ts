/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from 'src/plugins/data/common';
import { ESFilter } from '../../../../../../typings/elasticsearch';

import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';
import { AlertServices } from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { ThresholdQueryBucket } from './types';
import { BuildRuleMessage } from './rule_messages';
import { findPreviousThresholdSignals } from './threshold_find_previous_signals';

interface GetThresholdBucketFiltersParams {
  from: string;
  to: string;
  indexPattern: string[];
  services: AlertServices;
  logger: Logger;
  ruleId: string;
  bucketByField: string;
  timestampOverride: TimestampOverrideOrUndefined;
  buildRuleMessage: BuildRuleMessage;
}

export const getThresholdBucketFilters = async ({
  from,
  to,
  indexPattern,
  services,
  logger,
  ruleId,
  bucketByField,
  timestampOverride,
  buildRuleMessage,
}: GetThresholdBucketFiltersParams): Promise<{
  filters: Filter[];
  searchErrors: string[];
}> => {
  const { searchResult, searchErrors } = await findPreviousThresholdSignals({
    indexPattern,
    from,
    to,
    services,
    logger,
    ruleId,
    bucketByField,
    timestampOverride,
    buildRuleMessage,
  });

  const filters: ESFilter[] = [];
  searchResult.aggregations.threshold.buckets.forEach((bucket: ThresholdQueryBucket) => {
    filters.push({
      bool: {
        must: [
          {
            term: {
              [bucketByField ?? 'signal.rule.rule_id']: bucket.key,
            },
          },
          {
            range: {
              [timestampOverride ?? '@timestamp']: {
                lte: bucket.lastSignalTimestamp.value_as_string,
              },
            },
          },
        ],
      },
    });
  });

  return {
    filters: [
      ({
        bool: {
          must_not: filters,
        },
      } as unknown) as Filter,
    ],
    searchErrors,
  };
};
