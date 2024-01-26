/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { has } from 'lodash';
import type { AlertType, AlertsByTypeAgg, AlertsTypeData, AlertsByRuleAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { SummaryChartsData, SummaryChartsAgg } from '../alerts_summary_charts_panel/types';
import { DETECTION, PREVENTION } from './translations';

export const ALERT_TYPE_COLOR = {
  Detection: '#D36086',
  Prevention: '#54B399',
};
export const ALERT_TYPE_LABEL = {
  Detection: DETECTION,
  Prevention: PREVENTION,
};

export const parseAlertsRuleData = (
  response: AlertSearchResponse<{}, AlertsByRuleAgg>
): AlertsTypeData[] => {
  const rulesBuckets = response?.aggregations?.alertsByRule?.buckets ?? [];

  return rulesBuckets.length === 0
    ? []
    : rulesBuckets.map((rule) => {
        return {
          rule: rule.key,
          type: 'Detection' as AlertType,
          value: rule.doc_count,
          color: ALERT_TYPE_COLOR.Detection,
        };
      });
};

export const parseAlertsTypeData = (
  response: AlertSearchResponse<{}, AlertsByTypeAgg>
): AlertsTypeData[] => {
  const rulesBuckets = response?.aggregations?.alertsByType?.buckets ?? [];
  return rulesBuckets.length === 0
    ? []
    : rulesBuckets.flatMap((rule) => {
        const events = rule.ruleByEventType?.buckets ?? [];
        return getAlertType(rule.key, rule.doc_count, events);
      });
};

const getAlertType = (
  ruleName: string,
  ruleCount: number,
  ruleEvents: Array<{ key: string; doc_count: number }>
): AlertsTypeData[] => {
  const preventions = ruleEvents.find((bucket) => bucket.key === 'denied');
  if (!preventions) {
    return [
      {
        rule: ruleName,
        type: 'Detection' as AlertType,
        value: ruleCount,
        color: ALERT_TYPE_COLOR.Detection,
      },
    ];
  }

  const ret = [];
  if (preventions.doc_count < ruleCount) {
    ret.push({
      rule: ruleName,
      type: 'Detection' as AlertType,
      value: ruleCount - preventions.doc_count,
      color: ALERT_TYPE_COLOR.Detection,
    });
  }

  ret.push({
    rule: ruleName,
    type: 'Prevention' as AlertType,
    value: preventions.doc_count,
    color: ALERT_TYPE_COLOR.Prevention,
  });

  return ret;
};

export const getIsAlertsTypeData = (data: SummaryChartsData[]): data is AlertsTypeData[] => {
  return data?.every((x) => has(x, 'type'));
};

export const getIsAlertsByTypeAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsByTypeAgg> => {
  return has(data, 'aggregations.alertsByType');
};

export const getIsAlertsByRuleAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsByRuleAgg> => {
  return has(data, 'aggregations.alertsByRule');
};
