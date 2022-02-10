/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  FieldValuePair,
  CorrelationsParams,
} from '../../../../common/correlations/types';
import { getCorrelationsFilters } from './get_filters';

export const getTermsQuery = ({ fieldName, fieldValue }: FieldValuePair) => {
  return { term: { [fieldName]: fieldValue } };
};

interface QueryParams {
  params: CorrelationsParams;
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

  const correlationFilters = getCorrelationsFilters({
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    start,
    end,
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
