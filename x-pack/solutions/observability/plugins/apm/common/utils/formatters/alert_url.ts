/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify } from 'querystring';
import { ENVIRONMENT_ALL } from '../../environment_filter_values';

const APM_SERVICES_PATH = '/app/apm/services';

const format = ({ pathname, query }: { pathname: string; query: Record<string, any> }): string => {
  return `${pathname}?${stringify(query)}`;
};

const getApmServicePathname = (serviceName: string | undefined, suffix = '') => {
  // Missing service.name: inventory, not `/services/undefined` (404).
  if (!serviceName) {
    return APM_SERVICES_PATH;
  }
  return `${APM_SERVICES_PATH}/${encodeURIComponent(serviceName)}${suffix}`;
};

export const getAlertUrlErrorCount = (
  serviceName: string | undefined,
  serviceEnv: string | undefined
) =>
  format({
    pathname: getApmServicePathname(serviceName, '/errors'),
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
    pathname: getApmServicePathname(serviceName),
    query: {
      // Leave undefined so querystring.stringify emits `transactionType=` (empty value).
      transactionType,
      environment: serviceEnv ?? ENVIRONMENT_ALL.value,
    },
  });
