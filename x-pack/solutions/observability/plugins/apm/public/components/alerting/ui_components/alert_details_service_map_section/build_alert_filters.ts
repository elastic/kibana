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
 * Build a KQL string that scopes the service map preview to the alerting context
 * (service + transaction.type + transaction.name). Mirrors the filter badges
 * shown above the map.
 *
 * Values are escaped via `escapeQuotes` from `@kbn/es-query`, which escapes both
 * backslashes and double-quotes — required for KQL "QuotedCharacter" values and
 * what the previous `replace(/"/g, '\\"')` was missing (flagged by CodeQL as
 * "Incomplete string escaping or encoding" because a stray backslash in the
 * input would otherwise pass through and corrupt the quoted token).
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

/**
 * Build the user-facing filter chips shown above the service map preview. These
 * are display-only — escaping is not applied here, since chips render the raw
 * value next to the field name (e.g. `service.name: opbeans-node`).
 */
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
