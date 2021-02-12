/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { get, isEmpty } from 'lodash';

import { Filter } from 'src/plugins/data/common';
import { ESFilter } from '../../../../../../typings/elasticsearch';

import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { ThresholdSignalHistory, ThresholdSignalHistoryRecord } from './types';
import { BuildRuleMessage } from './rule_messages';
import { findPreviousThresholdSignals } from './threshold_find_previous_signals';

interface GetThresholdBucketFiltersParams {
  from: string;
  to: string;
  indexPattern: string[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  ruleId: string;
  bucketByFields: string[];
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
  bucketByFields,
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
    bucketByFields,
    timestampOverride,
    buildRuleMessage,
  });

  const thresholdSignalHistory = searchResult.hits.hits.reduce<ThresholdSignalHistory>(
    (acc, hit) => {
      const terms = bucketByFields.map((field) => {
        return {
          field,
          value: get(hit._source, field),
        };
      });

      const hash = crypto
        .createHash('sha256')
        .update(
          terms
            .map((field) => {
              return field.value;
            })
            .join(',')
        )
        .digest('hex');

      const existing = acc[hash];
      if (existing != null && hit._source) {
        if (hit._source.original_time && hit._source.original_time > existing.lastSignalTimestamp) {
          acc[hash].lastSignalTimestamp = hit._source.original_time as number;
        } else {
          acc[hash] = {
            terms,
            lastSignalTimestamp: hit._source.original_time as number,
          };
        }
      }
      return acc;
    },
    {}
  );

  // const filters = searchResult.aggregations.threshold.buckets.reduce(
  const filters = Object.values(thresholdSignalHistory).reduce(
    (acc: ESFilter[], bucket: ThresholdSignalHistoryRecord): ESFilter[] => {
      const filter = {
        bool: {
          filter: [
            {
              range: {
                [timestampOverride ?? '@timestamp']: {
                  lte: bucket.lastSignalTimestamp, // TODO: convert to string?
                },
              },
            },
          ],
        },
      } as ESFilter;

      if (!isEmpty(bucketByFields)) {
        bucket.terms.forEach((term) => {
          if (term.field != null) {
            // TODO: is this right?
            (filter.bool.filter as ESFilter[]).push({
              term: {
                [term.field]: term.value as string, // TODO: is this right?
              },
            });
          }
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
