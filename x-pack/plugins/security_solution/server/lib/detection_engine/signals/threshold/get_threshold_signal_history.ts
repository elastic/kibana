/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { TimestampOverrideOrUndefined } from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { Logger } from '../../../../../../../../src/core/server';
import { ThresholdSignalHistory } from '../types';
import { BuildRuleMessage } from '../rule_messages';
import { findPreviousThresholdSignals } from './find_previous_threshold_signals';
import { getThresholdTermsHash } from '../utils';

interface GetThresholdSignalHistoryParams {
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

export const getThresholdSignalHistory = async ({
  from,
  to,
  indexPattern,
  services,
  logger,
  ruleId,
  bucketByFields,
  timestampOverride,
  buildRuleMessage,
}: GetThresholdSignalHistoryParams): Promise<{
  thresholdSignalHistory: ThresholdSignalHistory;
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

      const terms =
        hit._source.signal?.threshold_result?.terms != null
          ? hit._source.signal.threshold_result.terms
          : [
              // Pre-7.12 signals
              {
                field:
                  (((hit._source.signal?.rule as RulesSchema).threshold as unknown) as {
                    field: string;
                  }).field ?? '',
                value: ((hit._source.signal?.threshold_result as unknown) as { value: string })
                  .value,
              },
            ];

      const hash = getThresholdTermsHash(terms);
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

  return {
    thresholdSignalHistory,
    searchErrors,
  };
};
