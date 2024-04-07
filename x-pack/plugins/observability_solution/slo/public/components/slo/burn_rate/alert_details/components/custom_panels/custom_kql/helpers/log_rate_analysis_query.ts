/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlWithFiltersSchema } from '@kbn/slo-schema';
import { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import { KQLCustomIndicator } from '@kbn/slo-schema';

export const getESQueryForLogRateAnalysis = (params: KQLCustomIndicator['params']) => {
  const { filter, good, total } = params;

  const filterKuery = kqlWithFiltersSchema.is(filter) ? filter.kqlQuery : filter;
  const filterFilters: Filter[] = [];

  if (kqlWithFiltersSchema.is(filter)) {
    filter.filters.forEach((i) => filterFilters.push(i));
  }
  const goodKuery = kqlWithFiltersSchema.is(good) ? good.kqlQuery : good;
  const goodFilters = kqlWithFiltersSchema.is(good) ? good.filters : [];
  const totalKuery = kqlWithFiltersSchema.is(total) ? total.kqlQuery : total;
  const totalFilters = kqlWithFiltersSchema.is(total) ? total.filters : [];
  const customGoodFilter = buildEsQuery({ kuery: goodKuery, filters: goodFilters });
  const customTotalFilter = buildEsQuery({ kuery: totalKuery, filters: totalFilters });
  const customFilters = buildEsQuery({ kuery: filterKuery, filters: filterFilters });

  // TODO add group by to the return result
  const finalQuery = {
    bool: { filter: [customTotalFilter, customFilters], must_not: customGoodFilter },
  };
  return finalQuery;
};
