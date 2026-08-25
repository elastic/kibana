/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify } from 'querystring';
import { ENVIRONMENT_ALL } from '@kbn/apm-types';

const format = ({ pathname, query }: { pathname: string; query: Record<string, any> }): string => {
  return `${pathname}?${stringify(query)}`;
};

export const getAlertUrlErrorCount = (
  serviceName: string | undefined,
  serviceEnv: string | undefined
) =>
  format({
    // String(undefined) is "undefined", matching encodeURIComponent's JS coercion so a
    // missing service.name stays `/services/undefined/...` rather than an empty segment.
    pathname: `/app/apm/services/${encodeURIComponent(String(serviceName))}/errors`,
    query: {
      environment: serviceEnv ?? ENVIRONMENT_ALL.value,
    },
  });

export const getAlertUrlErrorDetails = (
  serviceName: string,
  groupId: string,
  serviceEnv: string | undefined
) =>
  format({
    pathname: `/app/apm/services/${encodeURIComponent(serviceName)}/errors/${encodeURIComponent(
      groupId
    )}`,
    query: {
      environment: serviceEnv ?? ENVIRONMENT_ALL.value,
    },
  });

// This formatter is for TransactionDuration, TransactionErrorRate, and Anomaly.
export const getAlertUrlTransaction = (
  serviceName: string | undefined,
  serviceEnv: string | undefined,
  transactionType: string | undefined
) =>
  format({
    pathname: `/app/apm/services/${encodeURIComponent(String(serviceName))}`,
    query: {
      // Leave undefined so querystring.stringify emits `transactionType=` (empty value).
      transactionType,
      environment: serviceEnv ?? ENVIRONMENT_ALL.value,
    },
  });
