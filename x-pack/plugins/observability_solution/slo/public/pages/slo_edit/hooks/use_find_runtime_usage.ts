/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { QuerySchema, querySchema } from '@kbn/slo-schema';
import { FieldPath, useFormContext } from 'react-hook-form';
import { CreateSLOForm } from '../types';
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

export const useRunTimeFieldBeingUsed = (
  name: FieldPath<CreateSLOForm>,
  dataView?: DataView
): string[] => {
  const { watch } = useFormContext<CreateSLOForm>();
  const value = watch(name);

  if (!dataView || !value) {
    return [];
  }
  const runTimeMappings = dataView.getRuntimeMappings();
  const filter = querySchema.is(value) ? value : undefined;
  const fieldNames = Object.keys(runTimeMappings).filter((key) => {
    return isFieldBeingUsed(key, filter);
  });
  return fieldNames ?? [];
};
