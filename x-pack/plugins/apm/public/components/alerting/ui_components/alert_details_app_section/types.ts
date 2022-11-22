/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/alerting-plugin/common';
import { TopAlert } from '@kbn/observability-plugin/public/pages/alerts';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

export const SERVICE_NAME = 'service.name' as const;
export const TRANSACTION_TYPE = 'transaction.type' as const;
export interface AlertDetailsAppSectionProps {
  rule: Rule<{
    environment: string;
    aggregationType: LatencyAggregationType;
    windowSize: number;
    windowUnit: TIME_UNITS;
  }>;
  alert: TopAlert<{ [SERVICE_NAME]: string; [TRANSACTION_TYPE]: string }>;
  timeZone: string;
}
