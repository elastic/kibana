/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { Indicator, QuerySchema, querySchema } from '@kbn/slo-schema';
const isFieldBeingUsed = (fieldName: string, query?: QuerySchema) => {
  if (!query) {
    return false;
  }
  const checkKql = (kql: string) => {
    const queryStr = kql.replace(/\s{2,}/g, ' ').trim();
    return queryStr.includes(`${fieldName} :`) || queryStr.includes(`${fieldName}:`);
  };
  if (typeof query === 'string') {
    return checkKql(query);
  } else {
    const kql = query.kqlQuery;
    const inKql = kql && checkKql(kql);
    const inFilter =
      query.filters &&
      query.filters.some((filter) => {
        return filter.meta.field === fieldName || filter.meta.key === fieldName;
      });
    return inKql || inFilter;
  }
};

export const useRunTimeFieldBeingUsed = (dataView?: DataView, indicator?: Indicator): string[] => {
  if (!dataView || !indicator || !indicator.params) {
    return [];
  }
  const runTimeMappings = dataView.getRuntimeMappings();
  const filter = indicator.params.filter;
  const good =
    'good' in indicator.params && querySchema.is(indicator.params.good)
      ? indicator.params.good
      : undefined;
  const total =
    'total' in indicator.params && querySchema.is(indicator.params.total)
      ? indicator.params.total
      : undefined;
  const fieldNames = Object.keys(runTimeMappings).filter((key) => {
    if (isFieldBeingUsed(key, filter)) {
      return true;
    }
    if (good && isFieldBeingUsed(key, good)) {
      return true;
    }
    return !!(total && isFieldBeingUsed(key, total));
  });
  return fieldNames ?? [];
};
