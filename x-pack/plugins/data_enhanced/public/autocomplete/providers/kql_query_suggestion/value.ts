/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { escapeQuotes } from './lib/escape_kuery';
import { KqlQuerySuggestionProvider } from './types';
import { getAutocompleteService } from '../../../services';
import {
  IFieldType,
  IIndexPattern,
  QuerySuggestion,
  QuerySuggestionTypes,
} from '../../../../../../../src/plugins/data/public';

const wrapAsSuggestions = (start: number, end: number, query: string, values: string[]) =>
  values
    .filter((value) => value.toLowerCase().includes(query.toLowerCase()))
    .map((value) => ({
      type: QuerySuggestionTypes.Value,
      text: `${value} `,
      start,
      end,
    }));

export const setupGetValueSuggestions: KqlQuerySuggestionProvider = () => {
  return async (
    { indexPatterns, boolFilter, useTimeRange, signal },
    { start, end, prefix, suffix, fieldName, nestedPath }
  ): Promise<QuerySuggestion[]> => {
    const fullFieldName = nestedPath ? `${nestedPath}.${fieldName}` : fieldName;

    const indexPatternFieldEntries: Array<[IIndexPattern, IFieldType]> = [];
    indexPatterns.forEach((indexPattern) => {
      indexPattern.fields
        .filter((field) => field.name === fullFieldName)
        .forEach((field) => indexPatternFieldEntries.push([indexPattern, field]));
    });

    const query = `${prefix}${suffix}`.trim();
    const { getValueSuggestions } = getAutocompleteService();

    const data = await Promise.all(
      indexPatternFieldEntries.map(([indexPattern, field]) =>
        getValueSuggestions({
          indexPattern,
          field,
          query,
          boolFilter,
          useTimeRange,
          signal,
        }).then((valueSuggestions) => {
          const quotedValues = valueSuggestions.map((value) =>
            typeof value === 'string' ? `"${escapeQuotes(value)}"` : `${value}`
          );

          return wrapAsSuggestions(start, end, query, quotedValues);
        })
      )
    );

    return flatten(data);
  };
};
