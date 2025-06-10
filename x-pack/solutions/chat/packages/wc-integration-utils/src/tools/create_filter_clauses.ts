/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SearchFilter } from './generate_search_schema';

export const createFilterClauses = ({
  filters,
  values,
}: {
  filters: SearchFilter[];
  values: Record<string, unknown>;
}): QueryDslQueryContainer[] => {
  const clauses: QueryDslQueryContainer[] = [];

  Object.entries(values).forEach(([field, value]) => {
    const filter = filters.find((f) => f.field === field);
    if (filter) {
      if (filter.type === 'keyword' || filter.type === 'boolean') {
        clauses.push({
          term: { [field]: value as FieldValue },
        });
      }
      // TODO: handle other field types, date mostly
    }
  });

  return clauses;
};
