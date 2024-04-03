/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_VALUE,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlQuerySchema,
  SLOResponse,
} from '@kbn/slo-schema';

export function convertSliApmParamsToApmAppDeeplinkUrl(slo: SLOResponse): string | undefined {
  if (
    !apmTransactionDurationIndicatorSchema.is(slo.indicator) &&
    !apmTransactionErrorRateIndicatorSchema.is(slo.indicator)
  ) {
    return undefined;
  }

  const {
    indicator: {
      params: { environment, filter, service, transactionName, transactionType },
    },
    timeWindow: { duration },
    groupBy,
    instanceId,
  } = slo;

  const qs = new URLSearchParams('comparisonEnabled=true');

  if (environment) {
    qs.append('environment', environment === ALL_VALUE ? 'ENVIRONMENT_ALL' : environment);
  }

  if (transactionType) {
    qs.append('transactionType', transactionType === ALL_VALUE ? '' : transactionType);
  }

  if (duration) {
    qs.append('rangeFrom', `now-${duration}`);
    qs.append('rangeTo', 'now');
  }

  const kueryParams = [];
  if (transactionName && transactionName !== ALL_VALUE) {
    kueryParams.push(`transaction.name : "${transactionName}"`);
  }
  if (filter && kqlQuerySchema.is(filter) && filter.length > 0) {
    kueryParams.push(filter);
  }
  if (groupBy !== ALL_VALUE && instanceId !== ALL_VALUE) {
    kueryParams.push(`${groupBy} : "${instanceId}"`);
  }

  if (kueryParams.length > 0) {
    qs.append('kuery', kueryParams.join(' and '));
  }

  return `/app/apm/services/${service}/overview?${qs.toString()}`;
}
