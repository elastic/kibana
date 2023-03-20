/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Props {
  duration: string;
  environment: string;
  filter: string | undefined;
  service: string;
  transactionName: string;
  transactionType: string;
}

export function convertSliApmParamsToApmAppDeeplinkUrl({
  duration,
  environment,
  filter,
  service,
  transactionName,
  transactionType,
}: Props) {
  if (!service) {
    return '';
  }

  const environmentPartial = environment
    ? `&environment=${environment === '*' ? 'ENVIRONMENT_ALL' : environment}`
    : '';

  const transactionTypePartial = transactionType
    ? `&transactionType=${transactionType === '*' ? '' : transactionType}`
    : '';

  const dateRangePartial = duration ? `&rangeFrom=now-${duration}&rangeTo=now` : '';

  const filterPartial =
    filter || transactionName
      ? `&kuery=${encodeURIComponent(
          `${
            transactionName && transactionName !== '*'
              ? `transaction.name : "${transactionName}"`
              : ''
          } ${filter ? `and ${filter}` : ''}`
        )}`
      : '';

  return `/app/apm/services/${service}/overview?comparisonEnabled=true${environmentPartial}${transactionTypePartial}${filterPartial}${dateRangePartial}`;
}
