/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { has } from 'lodash';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { severityLabels } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { SummaryChartsAgg, SummaryChartsData } from '../alerts_summary_charts_panel/types';
import * as i18n from './translations';
import type { AlertsBySeverityAgg } from './types';

export const getSeverityColor = (severity: string) => {
  return SEVERITY_COLOR[severity.toLocaleLowerCase() as Severity] ?? emptyDonutColor;
};

export const parseSeverityData = (
  response: AlertSearchResponse<{}, AlertsBySeverityAgg>
): SeverityData[] => {
  const severityBuckets = response?.aggregations?.statusBySeverity?.buckets ?? [];

  return severityBuckets.length === 0
    ? []
    : severityBuckets.map((severity) => {
        return {
          key: severity.key,
          value: severity.doc_count,
          label: severityLabels[severity.key] ?? i18n.UNKNOWN_SEVERITY,
        };
      });
};

export const getIsAlertsBySeverityData = (data: SummaryChartsData[]): data is SeverityData[] => {
  return data?.every((x) => has(x, 'key'));
};

export const getIsAlertsBySeverityAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsBySeverityAgg> => {
  return has(data, 'aggregations.statusBySeverity');
};
