/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type {
  AlertsResponse,
  AlertsBySeverityAgg,
  AlertsByRuleAgg,
  AlertsByHostAgg,
  SeverityData,
  DetectionsData,
  HostData,
} from './types';
import type { EntityFilter } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import * as i18n from './translations';
import { severityLabels } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';

export const DEFAULT_QUERY_SIZE = 1000;

export const getSeverityColor = (severity: string) => {
  return SEVERITY_COLOR[severity.toLocaleLowerCase() as Severity] ?? emptyDonutColor;
};

export const parseSeverityData = (
  response: AlertsResponse<{}, AlertsBySeverityAgg>
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
  response: AlertsResponse<{}, AlertsByRuleAgg>
): DetectionsData[] | null => {
  const rulesBuckets = response?.aggregations?.alertsByRule?.buckets ?? [];

  return rulesBuckets.length === 0
    ? null
    : rulesBuckets.map((rule) => {
        const events = rule.ruleByEventType?.buckets ?? [];
        return getAggregateDetections(rule.key, events);
      });
};

const getAggregateDetections = (
  ruleName: string,
  ruleEvents: Array<{ key: string; doc_count: number }>
): DetectionsData => {
  const agg = { rule: ruleName, detections: 0, preventions: 0 };
  ruleEvents.map((eventBucket) =>
    eventBucket.key === 'denied'
      ? (agg.preventions += eventBucket.doc_count)
      : (agg.detections += eventBucket.doc_count)
  );
  return agg;
};

export const parseHostData = (response: AlertsResponse<{}, AlertsByHostAgg>): HostData[] | null => {
  const hostsBuckets = response?.aggregations?.alertsByHost?.buckets ?? [];

  return hostsBuckets.length === 0
    ? null
    : hostsBuckets.map((host) => {
        return {
          key: host.key,
          value: host.doc_count,
          label: host.key,
        };
      });
};

export const getAlertsQuery = ({
  additionalFilters = [],
  from,
  to,
  entityFilter,
  runtimeMappings,
  aggregations,
}: {
  from: string;
  to: string;
  entityFilter?: EntityFilter;
  additionalFilters?: ESBoolQuery[];
  runtimeMappings?: MappingRuntimeFields;
  aggregations: {};
}) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        ...additionalFilters,
        { range: { '@timestamp': { gte: from, lte: to } } },
        ...(entityFilter
          ? [
              {
                term: {
                  [entityFilter.field]: entityFilter.value,
                },
              },
            ]
          : []),
      ],
    },
  },
  aggs: aggregations,
  runtime_mappings: runtimeMappings,
});
