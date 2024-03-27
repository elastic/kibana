/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerting-plugin/common';
import type {
  TopAlert,
  AlertSummaryField,
} from '@kbn/observability-plugin/public';
import type { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import type { SERVICE_ENVIRONMENT } from '../../../../../common/es_fields/apm';

export const SERVICE_NAME = 'service.name' as const;
export const TRANSACTION_TYPE = 'transaction.type' as const;
export const TRANSACTION_NAME = 'transaction.name' as const;
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
    [SERVICE_ENVIRONMENT]: string;
    [TRANSACTION_NAME]: string;
  }>;
  timeZone: string;
  setAlertSummaryFields: React.Dispatch<
    React.SetStateAction<AlertSummaryField[] | undefined>
  >;
}
