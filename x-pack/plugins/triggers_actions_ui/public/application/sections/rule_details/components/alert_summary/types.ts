/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { AlertStatus, ValidFeatureId } from '@kbn/rule-data-utils';

export interface Alert {
  key: number;
  doc_count: number;
}

export interface AlertSummaryTimeRange {
  utcFrom: string;
  utcTo: string;
  // fixed_interval condition in ES query such as 1m, 1h, 1d
  fixedInterval: string;
  title?: JSX.Element | string;
  dateFormat?: string;
}

export interface AlertSummaryWidgetProps {
  featureIds?: ValidFeatureId[];
  filter?: estypes.QueryDslQueryContainer;
  fullSize?: boolean;
  onClick?: (status?: AlertStatus) => void;
  timeRange: AlertSummaryTimeRange;
}
