/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify } from 'querystring';
import { ENVIRONMENT_ALL } from '../../environment_filter_values';

const format = ({
  pathname,
  query,
}: {
  pathname: string;
  query: Record<string, any>;
}): string => {
  return `${pathname}?${stringify(query)}`;
};

export const getAlertUrlErrorCount = (
  serviceName: string,
  serviceEnv: string | undefined
) =>
  format({
    pathname: `/app/apm/services/${serviceName}/errors`,
    query: {
      environment: serviceEnv ?? ENVIRONMENT_ALL.value,
    },
  });
// This formatter is for TransactionDuration, TransactionErrorRate, and TransactionDurationAnomaly.
export const getAlertUrlTransaction = (
  serviceName: string,
  serviceEnv: string | undefined,
  transactionType: string
) =>
  format({
    pathname: `/app/apm/services/${serviceName}`,
    query: {
      transactionType,
      environment: serviceEnv ?? ENVIRONMENT_ALL.value,
    },
  });
