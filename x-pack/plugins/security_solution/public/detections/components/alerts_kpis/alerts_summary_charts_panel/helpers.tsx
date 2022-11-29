/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chartConfigs } from '../../../../overview/components/detection_response/alerts_by_status/alerts_by_status';
import type { AlertsBySeverityResponse, AlertsBySeverityAgg, ParsedAlertsData } from './types';
import * as i18n from './translations';

export const parseAlertsData = (
  response: AlertsBySeverityResponse<{}, AlertsBySeverityAgg>
): ParsedAlertsData => {
  const severityBuckets = response?.aggregations?.statusBySeverity?.buckets ?? [];
  if (severityBuckets.length === 0) {
    return null;
  }
  const data = severityBuckets.map((severity) => {
    return {
      key: severity.key,
      value: severity.doc_count,
      label: chartConfigs.find((cfg) => cfg.key === severity.key)?.label ?? i18n.UNKNOWN_SEVERITY,
    };
  });
  return data;
};
