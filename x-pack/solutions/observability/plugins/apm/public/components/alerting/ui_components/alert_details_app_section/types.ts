/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerting-plugin/common';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { ApmRuleType } from '@kbn/rule-data-utils';
import type {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
} from '../../../../../common/es_fields/apm';

export type ChartId = 'latency' | 'failedTransactionRate' | 'throughput';

interface ChartLayout {
  primary: ChartId;
  secondary: [ChartId, ChartId];
}

export const DEFAULT_LAYOUT: ChartLayout = {
  primary: 'latency',
  secondary: ['throughput', 'failedTransactionRate'],
};

export const RULE_TYPE_CHART_LAYOUTS: Partial<Record<ApmRuleType, ChartLayout>> = {
  [ApmRuleType.TransactionDuration]: DEFAULT_LAYOUT,
  [ApmRuleType.TransactionErrorRate]: {
    primary: 'failedTransactionRate',
    secondary: ['throughput', 'latency'],
  },
};

export interface AlertDetailsAppSectionProps {
  rule: Rule<{
    environment: string;
    aggregationType: string;
    windowSize: number;
    windowUnit: TIME_UNITS;
  }>;
  alert: TopAlert<{
    [SERVICE_NAME]: string;
    [TRANSACTION_TYPE]: string;
    [TRANSACTION_NAME]?: string;
    [SERVICE_ENVIRONMENT]: string;
  }>;
  timeZone: string;
}
