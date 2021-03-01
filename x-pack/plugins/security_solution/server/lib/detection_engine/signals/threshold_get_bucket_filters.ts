/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { isEmpty } from 'lodash';

import { Filter } from 'src/plugins/data/common';
import { ESFilter } from '../../../../../../typings/elasticsearch';

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
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
      if (!hit._source) {
        return acc;
      }

      const terms = bucketByFields.map((field) => {
        let signalTerms = hit._source.signal?.threshold_result?.terms;

        // Handle pre-7.12 signals
        if (signalTerms == null) {
          signalTerms = [
            {
              field: (((hit._source.rule as RulesSchema).threshold as unknown) as { field: string })
                .field,
              value: ((hit._source.signal?.threshold_result as unknown) as { value: string }).value,
            },
          ];
        } else if (isEmpty(signalTerms)) {
          signalTerms = [];
        }

        const result = signalTerms.filter((resultField) => {
          return resultField.field === field;
        });

        return {
          field,
          value: result[0].value,
        };
      });

      const hash = crypto
        .createHash('sha256')
        .update(
          terms
            .sort((term1, term2) => (term1.field > term2.field ? 1 : -1))
            .map((field) => {
              return field.value;
            })
            .join(',')
        )
        .digest('hex');

      const existing = acc[hash];
      const originalTime =
        hit._source.signal?.original_time != null
          ? new Date(hit._source.signal?.original_time).getTime()
          : undefined;

      if (existing != null) {
        if (originalTime && originalTime > existing.lastSignalTimestamp) {
          acc[hash].lastSignalTimestamp = originalTime;
        }
      } else if (originalTime) {
        acc[hash] = {
          terms,
          lastSignalTimestamp: originalTime,
        };
      }
      return acc;
    },
    {}
  );

  const filters = Object.values(thresholdSignalHistory).reduce(
    (acc: ESFilter[], bucket: ThresholdSignalHistoryRecord): ESFilter[] => {
      const filter = {
        bool: {
          filter: [
            {
              range: {
                [timestampOverride ?? '@timestamp']: {
                  lte: new Date(bucket.lastSignalTimestamp).toISOString(),
                },
              },
            },
          ],
        },
      } as ESFilter;

      if (!isEmpty(bucketByFields)) {
        bucket.terms.forEach((term) => {
          if (term.field != null) {
            (filter.bool.filter as ESFilter[]).push({
              term: {
                [term.field]: `${term.value}`,
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
