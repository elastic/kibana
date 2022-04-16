/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '@kbn/core/types/elasticsearch';
import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { CorrelationsClientParams } from '../../../../common/correlations/types';

export function getCorrelationsFilters({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  start,
  end,
}: CorrelationsClientParams) {
  const correlationsFilters: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  if (serviceName) {
    correlationsFilters.push({ term: { [SERVICE_NAME]: serviceName } });
  }

  if (transactionType) {
    correlationsFilters.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }

  if (transactionName) {
    correlationsFilters.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }
  return correlationsFilters;
}
