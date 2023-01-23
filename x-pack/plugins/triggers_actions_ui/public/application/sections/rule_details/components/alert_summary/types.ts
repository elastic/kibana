/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { AlertStatus, ValidFeatureId } from '@kbn/rule-data-utils';
import { AlertSummaryTimeRange } from '../../../../hooks/use_load_alert_summary';

export interface AlertSummaryWidgetProps {
  featureIds?: ValidFeatureId[];
  filter?: estypes.QueryDslQueryContainer;
  onClick: (status?: AlertStatus) => void;
  timeRange: AlertSummaryTimeRange;
}
