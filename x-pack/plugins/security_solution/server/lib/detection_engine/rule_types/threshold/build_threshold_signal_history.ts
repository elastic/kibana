/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/api/types';

import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { SignalSource, ThresholdSignalHistory } from '../../signals/types';
import { getThresholdTermsHash } from '../../signals/utils';

interface GetThresholdSignalHistoryParams {
  alerts: Array<SearchHit<SignalSource>>;
  bucketByFields: string[];
}

export const buildThresholdSignalHistory = async ({
  alerts,
  bucketByFields,
}: GetThresholdSignalHistoryParams): Promise<ThresholdSignalHistory> => {
  const thresholdSignalHistory = alerts.reduce<ThresholdSignalHistory>((acc, hit) => {
    if (!hit._source) {
      return acc;
    }

    // TODO: get all values from `bucketByFields` on source. Store in terms.
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
              value: ((hit._source.signal?.threshold_result as unknown) as { value: string }).value,
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
  }, {});

  return thresholdSignalHistory;
};
