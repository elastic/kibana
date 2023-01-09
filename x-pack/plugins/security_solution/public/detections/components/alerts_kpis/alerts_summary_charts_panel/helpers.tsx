/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

import { euiPaletteColorBlind } from '@elastic/eui';
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
import * as i18n from './translations';
import { severityLabels } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';

export const DEFAULT_QUERY_SIZE = 1000;

export const DETECTION_COLORS = {
  Detections: 'success',
  Preventions: 'accent',
};

export const getSeverityColor = (severity: string) => {
  return SEVERITY_COLOR[severity.toLocaleLowerCase() as Severity] ?? emptyDonutColor;
};

export const getPieChartColor = (count: number, index: number) => {
  const rotNum = Math.ceil(count / 10);
  return euiPaletteColorBlind({ sortBy: 'natural', rotations: rotNum })[index];
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
export const EVENT_TYPE_COLOUR = {
  Detection: '#D36086',
  Prevention: '#54B399',
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
      color: EVENT_TYPE_COLOUR.Prevention,
    });
  }
  if (detections > 0) {
    ret.push({
      rule: ruleName,
      type: 'Detection' as AlertType,
      value: detections,
      color: EVENT_TYPE_COLOUR.Detection,
    });
  }
  return ret;
};

export const parseHostData = (
  response: AlertSearchResponse<{}, AlertsByHostAgg>
): HostData[] | null => {
  const hostsBuckets = response?.aggregations?.alertsByHost?.buckets ?? [];
  const total = response.hits.total.value;

  return hostsBuckets.length === 0
    ? null
    : hostsBuckets.map((host, i) => {
        return {
          key: host.key,
          value: host.doc_count,
          percentage: Math.round((host.doc_count / total) * 100),
          label: host.key,
          color: getPieChartColor(hostsBuckets.length, i),
          x: host.key,
          y: host.doc_count,
        };
      });
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

// export const getAlertsQuery = ({
//   additionalFilters = [],
//   from,
//   to,
//   entityFilter,
//   runtimeMappings,
//   aggregations,
// }: {
//   from: string;
//   to: string;
//   entityFilter?: EntityFilter;
//   additionalFilters?: ESBoolQuery[];
//   runtimeMappings?: MappingRuntimeFields;
//   aggregations: {};
// }) => ({
//   size: 0,
//   query: {
//     bool: {
//       filter: [
//         ...additionalFilters,
//         { range: { '@timestamp': { gte: from, lte: to } } },
//         ...(entityFilter
//           ? [
//               {
//                 term: {
//                   [entityFilter.field]: entityFilter.value,
//                 },
//               },
//             ]
//           : []),
//       ],
//     },
//   },
//   aggs: aggregations,
//   runtime_mappings: runtimeMappings,
// });
