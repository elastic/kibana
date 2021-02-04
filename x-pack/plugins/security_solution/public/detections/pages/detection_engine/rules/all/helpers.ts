/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@elastic/eui';
import {
  BulkRuleResponse,
  RuleResponseBuckets,
} from '../../../../containers/detection_engine/rules';

/**
 * Separates rules/errors from bulk rules API response (create/update/delete)
 *
 * @param response BulkRuleResponse from bulk rules API
 */
export const bucketRulesResponse = (response: BulkRuleResponse) =>
  response.reduce<RuleResponseBuckets>(
    (acc, cv): RuleResponseBuckets => {
      return 'error' in cv
        ? { rules: [...acc.rules], errors: [...acc.errors, cv] }
        : { rules: [...acc.rules, cv], errors: [...acc.errors] };
    },
    { rules: [], errors: [] }
  );

export const showRulesTable = ({
  rulesCustomInstalled,
  rulesInstalled,
}: {
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
}) =>
  (rulesCustomInstalled != null && rulesCustomInstalled > 0) ||
  (rulesInstalled != null && rulesInstalled > 0);

export const caseInsensitiveSort = (tags: string[]): string[] => {
  return tags.sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())); // Case insensitive
};

export const getSearchFilters = ({
  query,
  searchValue,
  filterOptions,
  defaultSearchTerm,
}: {
  query: Query | null;
  searchValue: string;
  filterOptions: Record<string, string | null>;
  defaultSearchTerm: string;
}): Record<string, string | null> => {
  try {
    const fieldClauses = query?.ast.getFieldClauses();

    if (fieldClauses != null && fieldClauses.length > 0) {
      const filtersReduced = fieldClauses.reduce<Record<string, string | null>>(
        (acc, { field, value }) => {
          acc[field] = `${value}`;

          return acc;
        },
        filterOptions
      );

      return filtersReduced;
    }

    return { [defaultSearchTerm]: searchValue };
  } catch {
    return { [defaultSearchTerm]: searchValue };
  }
};
