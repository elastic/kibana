/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';

export interface AlertFilterBadge {
  label: string;
  field: string;
}

/**
 * KQL scoping the preview to the alerting context. Values are escaped via
 * `escapeQuotes` (handles backslashes + double-quotes).
 */
export function buildKueryFromAlert(alert: AlertDetailsAppSectionProps['alert']): string {
  const parts: string[] = [];
  const serviceName = alert.fields[SERVICE_NAME];
  const transactionType = alert.fields[TRANSACTION_TYPE];
  const transactionName = alert.fields[TRANSACTION_NAME];

  if (serviceName != null && String(serviceName).trim() !== '') {
    parts.push(`service.name: "${escapeQuotes(String(serviceName))}"`);
  }
  if (transactionType != null && String(transactionType).trim() !== '') {
    parts.push(`transaction.type: "${escapeQuotes(String(transactionType))}"`);
  }
  if (transactionName != null && String(transactionName).trim() !== '') {
    parts.push(`transaction.name: "${escapeQuotes(String(transactionName))}"`);
  }
  return parts.join(' and ');
}

/** User-facing filter chips shown above the preview. Display only — no escaping. */
export function buildFiltersFromAlert(
  alert: AlertDetailsAppSectionProps['alert']
): AlertFilterBadge[] {
  const filters: AlertFilterBadge[] = [];
  const serviceName = alert.fields[SERVICE_NAME];
  const env = alert.fields[SERVICE_ENVIRONMENT];
  const transactionType = alert.fields[TRANSACTION_TYPE];
  const transactionName = alert.fields[TRANSACTION_NAME];

  if (serviceName) {
    filters.push({ label: `service.name: ${String(serviceName)}`, field: 'service.name' });
  }
  if (env != null && String(env).trim() !== '') {
    filters.push({
      label: `service.environment: ${String(env)}`,
      field: 'service.environment',
    });
  }
  if (transactionType != null && String(transactionType).trim() !== '') {
    filters.push({
      label: `transaction.type: ${String(transactionType)}`,
      field: 'transaction.type',
    });
  }
  if (transactionName != null && String(transactionName).trim() !== '') {
    filters.push({
      label: `transaction.name: ${String(transactionName)}`,
      field: 'transaction.name',
    });
  }
  return filters;
}
