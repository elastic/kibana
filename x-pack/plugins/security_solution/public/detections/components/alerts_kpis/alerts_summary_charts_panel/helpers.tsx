/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { AlertsResponse, AlertsBySeverityAgg, ParsedSeverityData } from './types';
import * as i18n from './translations';
import { severityLabels } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';

export const parseSeverityAlerts = (
  response: AlertsResponse<{}, AlertsBySeverityAgg>
): ParsedSeverityData => {
  const severityBuckets = response?.aggregations?.statusBySeverity?.buckets ?? [];
  if (severityBuckets.length === 0) {
    return null;
  }
  const data = severityBuckets.map((severity) => {
    return {
      key: severity.key,
      value: severity.doc_count,
      label: severityLabels[severity.key] ?? i18n.UNKNOWN_SEVERITY,
    };
  });
  return data;
};

export const getSeverityColor = (severity: string) => {
  return SEVERITY_COLOR[severity.toLocaleLowerCase() as Severity] ?? emptyDonutColor;
};
