/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum severity {
  critical = 'critical',
  major = 'major',
  minor = 'minor',
  warning = 'warning',
}

export function getMlPrefix(serviceName: string, transactionType?: string) {
  const maybeTransactionType = transactionType ? `${transactionType}-` : '';
  return encodeForMlApi(`${serviceName}-${maybeTransactionType}`);
}

export function getMlJobId(serviceName: string, transactionType?: string) {
  return `${getMlPrefix(serviceName, transactionType)}high_mean_response_time`;
}

export function getMlJobServiceName(jobId: string) {
  return jobId.split('-').slice(0, -2).join('-');
}

export function getMlIndex(serviceName: string, transactionType?: string) {
  return `.ml-anomalies-${getMlJobId(serviceName, transactionType)}`;
}

export function encodeForMlApi(value: string) {
  return value.replace(/\s+/g, '_').toLowerCase();
}

export function getSeverity(score?: number) {
  if (typeof score !== 'number') {
    return undefined;
  } else if (score < 25) {
    return severity.warning;
  } else if (score >= 25 && score < 50) {
    return severity.minor;
  } else if (score >= 50 && score < 75) {
    return severity.major;
  } else if (score >= 75) {
    return severity.critical;
  } else {
    return undefined;
  }
}
