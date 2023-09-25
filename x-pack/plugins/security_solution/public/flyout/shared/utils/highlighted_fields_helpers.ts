/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { UseHighlightedFieldsResult } from '../hooks/use_highlighted_fields';
import type { HighlightedFieldsTableRow } from '../../right/components/highlighted_fields';

/**
 * Converts the highlighted fields to a format that can be consumed by the HighlightedFields component
 * @param highlightedFields
 * @param scopeId
 */
export const convertHighlightedFieldsToTableRow = (
  highlightedFields: UseHighlightedFieldsResult,
  scopeId: string
): HighlightedFieldsTableRow[] => {
  const fieldNames = Object.keys(highlightedFields);
  return fieldNames.map((fieldName) => {
    const values = highlightedFields[fieldName].values;
    const overrideFieldName = highlightedFields[fieldName].overrideField;
    const field = overrideFieldName ? overrideFieldName : fieldName;

    return {
      field,
      description: {
        field,
        values,
        scopeId,
      },
    };
  });
};

/**
 * Converts the highlighted fields to a format that can be consumed by the prevalence query
 * @param highlightedFields
 */
export const convertHighlightedFieldsToPrevalenceFilters = (
  highlightedFields: UseHighlightedFieldsResult
): Record<string, QueryDslQueryContainer> => {
  const fieldNames = Object.keys(highlightedFields);
  return fieldNames.reduce((acc, curr) => {
    const values = highlightedFields[curr].values;

    return {
      ...acc,
      [curr]: { match: { [curr]: Array.isArray(values) ? values[0] : values } },
    };
  }, []) as unknown as Record<string, QueryDslQueryContainer>;
};
