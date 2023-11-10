/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { FieldValuePair } from '@kbn/ml-agg-utils';

import type { AiopsLogRateAnalysisSchema } from '../../../../common/api/log_rate_analysis/schema';

import { getFilters } from './get_filters';

export const getTermsQuery = ({ fieldName, fieldValue }: FieldValuePair) => {
  return { term: { [fieldName]: fieldValue } };
};

interface QueryParams {
  params: AiopsLogRateAnalysisSchema<'2'>;
  termFilters?: FieldValuePair[];
  filter?: estypes.QueryDslQueryContainer;
}
export const getQueryWithParams = ({
  params,
  termFilters,
  filter,
}: QueryParams): estypes.QueryDslQueryContainer => {
  const searchQuery = JSON.parse(params.searchQuery) as estypes.QueryDslQueryContainer;
  return {
    bool: {
      filter: [
        searchQuery,
        ...getFilters(params),
        ...(Array.isArray(termFilters) ? termFilters.map(getTermsQuery) : []),
        ...(filter ? [filter] : []),
      ] as estypes.QueryDslQueryContainer[],
    },
  };
};
