/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { ALERT_ORIGINAL_TIME } from '../../../../../common/field_maps/field_names';

import { SimpleHit, ThresholdSignalHistory } from '../types';
import { getThresholdTermsHash, isWrappedRACAlert, isWrappedSignalHit } from '../utils';

interface GetThresholdSignalHistoryParams {
  alerts: Array<SearchHit<unknown>>;
}

const getTerms = (alert: SimpleHit) => {
  if (isWrappedRACAlert(alert)) {
    const parameters = alert._source[ALERT_RULE_PARAMETERS] as unknown as Record<
      string,
      Record<string, string[]>
    >;
    return parameters.threshold.field.map((field) => ({
      field,
      value: alert._source[field] as string,
    }));
  } else if (isWrappedSignalHit(alert)) {
    return alert._source.signal?.threshold_result?.terms ?? [];
  } else {
    // We shouldn't be here
    return [];
  }
};

const getOriginalTime = (alert: SimpleHit) => {
  if (isWrappedRACAlert(alert)) {
    const originalTime = alert._source[ALERT_ORIGINAL_TIME];
    return originalTime != null ? new Date(originalTime as string).getTime() : undefined;
  } else if (isWrappedSignalHit(alert)) {
    const originalTime = alert._source.signal?.original_time;
    return originalTime != null ? new Date(originalTime).getTime() : undefined;
  } else {
    // We shouldn't be here
    return undefined;
  }
};

export const buildThresholdSignalHistory = ({
  alerts,
}: GetThresholdSignalHistoryParams): ThresholdSignalHistory => {
  const signalHistory = alerts.reduce<ThresholdSignalHistory>((acc, alert) => {
    if (!alert._source) {
      return acc;
    }

    const terms = getTerms(alert as SimpleHit);
    const hash = getThresholdTermsHash(terms);
    const existing = acc[hash];
    const originalTime = getOriginalTime(alert as SimpleHit);

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

  return signalHistory;
};
