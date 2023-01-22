/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AlertType, AlertsByTypeAgg, AlertsTypeData } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

export const ALERT_TYPE_COLOR = {
  Detection: '#D36086',
  Prevention: '#54B399',
};

export const parseAlertsTypeData = (
  response: AlertSearchResponse<{}, AlertsByTypeAgg>
): AlertsTypeData[] | null => {
  const rulesBuckets = response?.aggregations?.alertsByRule?.buckets ?? [];
  return rulesBuckets.length === 0
    ? null
    : rulesBuckets.flatMap((rule) => {
        const events = rule.ruleByEventType?.buckets ?? [];
        return getAggregateAlerts(rule.key, events);
      });
};

const getAggregateAlerts = (
  ruleName: string,
  ruleEvents: Array<{ key: string; doc_count: number }>
): AlertsTypeData[] => {
  let preventions = 0;
  let detections = 0;

  ruleEvents.map((eventBucket) => {
    return eventBucket.key === 'denied'
      ? (preventions += eventBucket.doc_count)
      : (detections += eventBucket.doc_count);
  });

  const ret = [];
  if (detections > 0) {
    ret.push({
      rule: ruleName,
      type: 'Detection' as AlertType,
      value: detections,
      color: ALERT_TYPE_COLOR.Detection,
    });
  }
  if (preventions > 0) {
    ret.push({
      rule: ruleName,
      type: 'Prevention' as AlertType,
      value: preventions,
      color: ALERT_TYPE_COLOR.Prevention,
    });
  }
  return ret;
};
