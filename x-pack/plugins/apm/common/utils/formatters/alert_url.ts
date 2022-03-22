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

export const getAlertUrlErrorCount = (serviceName: any[], serviceEnv: any[]) =>
  format({
    pathname: `/app/apm/services/${String(serviceName[0])}/errors`,
    query: {
      ...(serviceEnv?.[0]
        ? { environment: String(serviceEnv[0]) }
        : { environment: ENVIRONMENT_ALL.value }),
    },
  });

export const getAlertUrlTransactionDuration = (
  serviceName: any[],
  serviceEnv: any[],
  transactionType: any[]
) =>
  format({
    pathname: `/app/apm/services/${serviceName[0]!}`,
    query: {
      transactionType: transactionType[0]!,
      ...(serviceEnv?.[0]
        ? { environment: String(serviceEnv[0]) }
        : { environment: ENVIRONMENT_ALL.value }),
    },
  });

export const getAlertUrlTransactionErrorRate = (
  serviceName: any[],
  serviceEnv: any[],
  transactionType: any[]
) =>
  format({
    pathname: `/app/apm/services/${String(serviceName[0]!)}`,
    query: {
      transactionType: String(transactionType[0]!),
      ...(serviceEnv?.[0]
        ? { environment: String(serviceEnv[0]) }
        : { environment: ENVIRONMENT_ALL.value }),
    },
  });

export const getAlertUrlTransactionDurationAnomaly = (
  serviceName: any[],
  serviceEnv: any[],
  transactionType: any[]
) =>
  format({
    pathname: `/app/apm/services/${String(serviceName[0])}`,
    query: {
      transactionType: String(transactionType[0]),
      ...(serviceEnv?.[0]
        ? { environment: String(serviceEnv[0]) }
        : { environment: ENVIRONMENT_ALL.value }),
    },
  });
