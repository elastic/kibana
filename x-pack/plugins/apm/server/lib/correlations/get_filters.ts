/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { ESFilter } from '../../../../../../src/core/types/elasticsearch';
import { environmentQuery, rangeQuery, kqlQuery } from '../../utils/queries';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';

export interface CorrelationsOptions {
  setup: Setup & SetupTimeRange;
  environment?: string;
  kuery?: string;
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
