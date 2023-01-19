/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  AggregationType,
  AlertType,
  AlertsBySeverityAgg,
  AlertsByTypeAgg,
  AlertsByGroupingAgg,
  AlertsTypeData,
  AlertsProgressBarData,
} from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { BucketItem } from '../../../../../common/search_strategy/security_solution/cti';
import { severityLabels } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';
import * as i18n from './translations';

export const ALERT_TYPE_COLOR = {
  Detection: '#D36086',
  Prevention: '#54B399',
};

export const getSeverityColor = (severity: string) => {
  return SEVERITY_COLOR[severity.toLocaleLowerCase() as Severity] ?? emptyDonutColor;
};

export const parseSeverityData = (
  response: AlertSearchResponse<{}, AlertsBySeverityAgg>
): SeverityData[] | null => {
  const severityBuckets = response?.aggregations?.statusBySeverity?.buckets ?? [];

  return severityBuckets.length === 0
    ? null
    : severityBuckets.map((severity) => {
        return {
          key: severity.key,
          value: severity.doc_count,
          label: severityLabels[severity.key] ?? i18n.UNKNOWN_SEVERITY,
        };
      });
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
  if (preventions > 0) {
    ret.push({
      rule: ruleName,
      type: 'Prevention' as AlertType,
      value: preventions,
      color: ALERT_TYPE_COLOR.Prevention,
    });
  }
  if (detections > 0) {
    ret.push({
      rule: ruleName,
      type: 'Detection' as AlertType,
      value: detections,
      color: ALERT_TYPE_COLOR.Detection,
    });
  }
  return ret;
};

export const parseAlertsGroupingData = (
  response: AlertSearchResponse<{}, AlertsByGroupingAgg>
): AlertsProgressBarData[] | null => {
  const buckets = response?.aggregations?.alertsByGrouping?.buckets ?? [];
  if (buckets.length === 0) {
    return null;
  }

  const other = response?.aggregations?.alertsByGrouping?.sum_other_doc_count ?? 0;
  const total =
    buckets.reduce((acc: number, group: BucketItem) => acc + group.doc_count, 0) + other;

  const topHosts = buckets.map((group) => {
    return {
      key: group.key,
      value: group.doc_count,
      percentage: Math.round((group.doc_count / total) * 1000) / 10,
      label: group.key,
    };
  });

  topHosts.push({
    key: 'Other',
    value: other,
    percentage: Math.round((other / total) * 1000) / 10,
    label: 'Other',
  });

  return topHosts;
};

export const parseData = (aggregationType: AggregationType, data: AlertSearchResponse<{}, {}>) => {
  switch (aggregationType) {
    case 'Severity':
      return parseSeverityData(data as AlertSearchResponse<{}, AlertsBySeverityAgg>);
    case 'Type':
      return parseAlertsTypeData(data as AlertSearchResponse<{}, AlertsByTypeAgg>);
    case 'Top':
      return parseAlertsGroupingData(data as AlertSearchResponse<{}, AlertsByGroupingAgg>);
  }
};
