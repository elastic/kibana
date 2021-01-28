/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { Filter } from 'src/plugins/data/common';
import { ESFilter } from '../../../../../../typings/elasticsearch';

import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { ThresholdQueryBucket } from './types';
import { BuildRuleMessage } from './rule_messages';
import { findPreviousThresholdSignals } from './threshold_find_previous_signals';

interface GetThresholdBucketFiltersParams {
  from: string;
  to: string;
  indexPattern: string[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
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

  const filters = searchResult.aggregations.threshold.buckets.reduce(
    (acc: ESFilter[], bucket: ThresholdQueryBucket): ESFilter[] => {
      const filter = {
        bool: {
          filter: [
            {
              range: {
                [timestampOverride ?? '@timestamp']: {
                  lte: bucket.lastSignalTimestamp.value_as_string,
                },
              },
            },
          ],
        },
      } as ESFilter;

      if (!isEmpty(bucketByField)) {
        (filter.bool.filter as ESFilter[]).push({
          term: {
            [bucketByField]: bucket.key,
          },
        });
      }

      return [...acc, filter];
    },
    [] as ESFilter[]
  );

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
