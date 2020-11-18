/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from '@elastic/eui';
import { FilterValues } from './types';

export const getFieldValueMap = (query: Query) => {
  const fieldMap = new Map<string, FilterValues>();

  query.ast.clauses.forEach((clause) => {
    if (clause.type === 'field') {
      const { field, value } = clause;
      fieldMap.set(field, [
        ...(fieldMap.get(field) ?? []),
        ...((Array.isArray(value) ? value : [value]) as FilterValues),
      ]);
    }
  });

  return fieldMap;
};

export const getSearchTerm = (query: Query): string | undefined => {
  let term: string | undefined;
  if (query.ast.getTermClauses().length) {
    term = query.ast
      .getTermClauses()
      .map((clause) => clause.value)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return term?.length ? term : undefined;
};

export const applyAliases = (
  valueMap: Map<string, FilterValues>,
  aliasesMap: Record<string, string[]>
): Map<string, FilterValues> => {
  const reverseLookup: Record<string, string> = {};
  Object.entries(aliasesMap).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => {
      reverseLookup[alias] = canonical;
    });
  });

  const resultMap = new Map<string, FilterValues>();
  valueMap.forEach((values, field) => {
    const targetKey = reverseLookup[field] ?? field;
    resultMap.set(targetKey, [...(resultMap.get(targetKey) ?? []), ...values]);
  });

  return resultMap;
};
