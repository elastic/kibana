/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QuerySchema, FiltersSchema, kqlQuerySchema, kqlWithFiltersSchema } from '@kbn/slo-schema';

export const formatAllFilters = (
  globalFilters: QuerySchema = '',
  groupByCardinalityFilters: FiltersSchema
): QuerySchema => {
  if (kqlQuerySchema.is(globalFilters)) {
    return { kqlQuery: globalFilters, filters: groupByCardinalityFilters };
  } else if (kqlWithFiltersSchema.is(globalFilters)) {
    return {
      kqlQuery: globalFilters.kqlQuery,
      filters: [...globalFilters.filters, ...groupByCardinalityFilters],
    };
  } else {
    return { kqlQuery: '', filters: groupByCardinalityFilters };
  }
};
