/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SearchTypes } from '@kbn/securitysolution-rules';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import {
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_TIME,
} from '../../../../../common/field_maps/field_names';

import type { SimpleHit, ThresholdSignalHistory } from '../types';
import { getThresholdTermsHash, isWrappedDetectionAlert, isWrappedSignalHit } from '../utils';

interface GetThresholdSignalHistoryParams {
  alerts: Array<SearchHit<unknown>>;
  primaryTimestamp: string;
  secondaryTimestamp: string | undefined;
}

const getTerms = (alert: SimpleHit) => {
  if (isWrappedDetectionAlert(alert)) {
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

const getOriginalEvent = (alert: SimpleHit): Record<string, SearchTypes> | undefined => {
  if (isWrappedDetectionAlert(alert)) {
    return alert._source[ALERT_ORIGINAL_EVENT] as Record<string, SearchTypes>;
  } else if (isWrappedSignalHit(alert)) {
    return alert._source.signal?.original_event as Record<string, SearchTypes>;
  } else {
    // We shouldn't be here
    return undefined;
  }
};

const getOriginalTime = (alert: SimpleHit) => {
  if (isWrappedDetectionAlert(alert)) {
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
  primaryTimestamp,
  secondaryTimestamp,
}: GetThresholdSignalHistoryParams): ThresholdSignalHistory => {
  const signalHistory = alerts.reduce<ThresholdSignalHistory>((acc, alert) => {
    if (!alert._source) {
      return acc;
    }

    const terms = getTerms(alert as SimpleHit);
    const hash = getThresholdTermsHash(terms);
    const existing = acc[hash];
    const originalEvent = getOriginalEvent(alert as SimpleHit);
    const originalTimestamp = primaryTimestamp.startsWith('event.')
      ? primaryTimestamp.replace('event.', `${ALERT_ORIGINAL_EVENT}.`)
      : primaryTimestamp;
    const originalTime = (
      secondaryTimestamp
        ? originalEvent
          ? originalEvent[originalTimestamp]
          : undefined
        : getOriginalTime(alert as SimpleHit) ?? getOriginalTime(alert as SimpleHit)
    ) as number;

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
