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
  scopeId: string,
  isPreview: boolean
): HighlightedFieldsTableRow[] => {
  const fieldNames = Object.keys(highlightedFields);
  return fieldNames.map((fieldName) => {
    const overrideFieldName = highlightedFields[fieldName].overrideField?.field;
    const overrideFieldValues = highlightedFields[fieldName].overrideField?.values;
    const field = overrideFieldName ? overrideFieldName : fieldName;
    const values = overrideFieldValues?.length
      ? overrideFieldValues
      : highlightedFields[fieldName].values;

    return {
      field,
      description: {
        field,
        ...(overrideFieldName ? { originalField: fieldName } : {}),
        values,
        scopeId,
        isPreview,
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
      [curr]: { terms: { [curr]: values } },
    };
  }, []) as unknown as Record<string, QueryDslQueryContainer>;
};
