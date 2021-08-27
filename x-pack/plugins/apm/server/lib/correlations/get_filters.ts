/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESFilter } from '../../../../../../src/core/types/elasticsearch';
import {
  kqlQuery,
  rangeQuery,
} from '../../../../observability/server/utils/queries';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Setup, SetupTimeRange } from '../helpers/setup_request';

export interface CorrelationsOptions {
  setup: Setup & SetupTimeRange;
  environment: string;
  kuery: string;
  serviceName: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
}

export function getCorrelationsFilters({
  setup,
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
}: CorrelationsOptions) {
  const { start, end } = setup;
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
