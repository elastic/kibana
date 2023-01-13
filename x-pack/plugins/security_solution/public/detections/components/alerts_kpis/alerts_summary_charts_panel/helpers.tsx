/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  AlertsBySeverityAgg,
  AlertsByRuleAgg,
  AlertsByHostAgg,
  DetectionsData,
  HostData,
  AggregationType,
  AlertType,
} from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { BucketItem } from '../../../../../common/search_strategy/security_solution/cti';
import * as i18n from './translations';
import { severityLabels } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';

export const DETECTION_COLOR = {
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

export const parseDetectionsData = (
  response: AlertSearchResponse<{}, AlertsByRuleAgg>
): DetectionsData[] | null => {
  const rulesBuckets = response?.aggregations?.alertsByRule?.buckets ?? [];
  return rulesBuckets.length === 0
    ? null
    : rulesBuckets.flatMap((rule) => {
        const events = rule.ruleByEventType?.buckets ?? [];
        return getAggregateDetections(rule.key, events);
      });
};

const getAggregateDetections = (
  ruleName: string,
  ruleEvents: Array<{ key: string; doc_count: number }>
): DetectionsData[] => {
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
      color: DETECTION_COLOR.Prevention,
    });
  }
  if (detections > 0) {
    ret.push({
      rule: ruleName,
      type: 'Detection' as AlertType,
      value: detections,
      color: DETECTION_COLOR.Detection,
    });
  }
  return ret;
};

export const parseHostData = (
  response: AlertSearchResponse<{}, AlertsByHostAgg>
): HostData[] | null => {
  const hostsBuckets = response?.aggregations?.alertsByHost?.buckets ?? [];
  if (hostsBuckets.length === 0) {
    return null;
  }

  const other = response?.aggregations?.alertsByHost?.sum_other_doc_count ?? 0;
  const total = hostsBuckets.reduce((acc:number , host: BucketItem)=> 
    acc+= host.doc_count
  ,0) + other;

  const topHosts = hostsBuckets.map((host, i) => {
    return {
      key: host.key,
      value: host.doc_count,
      percentage: Math.round((host.doc_count / total) * 1000) / 10,
      label: host.key,
    };
  });

  topHosts.push({
    key: 'Other',
    value: other,
    percentage: Math.round((other / total) * 100),
    label: 'Other',
  });

  return topHosts;
};

export const parseData = (aggregationType: AggregationType, data: AlertSearchResponse<{}, {}>) => {
  switch (aggregationType) {
    case 'Severity':
      return parseSeverityData(data as AlertSearchResponse<{}, AlertsBySeverityAgg>);
    case 'Detections':
      return parseDetectionsData(data as AlertSearchResponse<{}, AlertsByRuleAgg>);
    case 'Host':
      return parseHostData(data as AlertSearchResponse<{}, AlertsByHostAgg>);
  }
};
