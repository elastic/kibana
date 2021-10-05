/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { getOrElse } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';
import type {
  FieldValuePair,
  SearchStrategyParams,
} from '../../../../common/search_strategies/types';
import { rangeRt } from '../../../routes/default_api_types';
import { getCorrelationsFilters } from './get_filters';

export const getTermsQuery = ({ fieldName, fieldValue }: FieldValuePair) => {
  return { term: { [fieldName]: fieldValue } };
};

interface QueryParams {
  params: SearchStrategyParams;
  termFilters?: FieldValuePair[];
}
export const getQueryWithParams = ({ params, termFilters }: QueryParams) => {
  const {
    environment,
    kuery,
    serviceName,
    start,
    end,
    transactionType,
    transactionName,
  } = params;

  // converts string based start/end to epochmillis
  const decodedRange = pipe(
    rangeRt.decode({ start, end }),
    getOrElse<t.Errors, { start: number; end: number }>((errors) => {
      throw new Error(failure(errors).join('\n'));
    })
  );

  const correlationFilters = getCorrelationsFilters({
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    start: decodedRange.start,
    end: decodedRange.end,
  });

  return {
    bool: {
      filter: [
        ...correlationFilters,
        ...(Array.isArray(termFilters) ? termFilters.map(getTermsQuery) : []),
      ] as estypes.QueryDslQueryContainer[],
    },
  };
};
