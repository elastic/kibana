/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import { has } from 'lodash';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { AlertsBySeverityAgg } from '../severity_level_panel/types';
import type { AlertsByTypeAgg, AlertsTypeData } from '../alerts_by_type_panel/types';
import type {
  AlertsByGroupingAgg,
  AlertsProgressBarData,
} from '../alerts_progress_bar_panel/types';

export type AggregationType = 'Severity' | 'Type' | 'Top';

export type SummaryChartsAgg = Partial<AlertsBySeverityAgg | AlertsByTypeAgg | AlertsByGroupingAgg>;

export type SummaryChartsData = SeverityData | AlertsTypeData | AlertsProgressBarData;

export interface ChartsPanelProps {
  filters?: Filter[];
  query?: Query;
  signalIndexName: string | null;
  runtimeMappings?: MappingRuntimeFields;
  skip?: boolean;
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
}

export const isAlertsBySeverityAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsBySeverityAgg> => {
  return has(data, 'aggregations.statusBySeverity');
};

export const isAlertsByTypeAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsByTypeAgg> => {
  return has(data, 'aggregations.alertsByRule');
};

export const isAlertsByGroupingAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsByGroupingAgg> => {
  return has(data, 'aggregations.alertsByGrouping');
};
