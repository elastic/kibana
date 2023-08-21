/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';

interface Props {
  duration?: string;
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
  if (filter && filter.length > 0) {
    kueryParams.push(filter);
  }

  if (kueryParams.length > 0) {
    qs.append('kuery', kueryParams.join(' and '));
  }

  return `/app/apm/services/${service}/overview?${qs.toString()}`;
}
