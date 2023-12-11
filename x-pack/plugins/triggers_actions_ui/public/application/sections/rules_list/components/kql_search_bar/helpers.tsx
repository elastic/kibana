/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';

export const enhanceSuggestionAbstractionFields = (
  enhanceSuggestionsAbstraction: SuggestionsAbstraction
): SuggestionsAbstraction => {
  return {
    type: enhanceSuggestionsAbstraction.type,
    fields: Object.entries(enhanceSuggestionsAbstraction.fields).reduce<
      SuggestionsAbstraction['fields']
    >((acc, [key, value]) => {
      const { displayField, nestedDisplayField, ...rest } = value;
      if (nestedDisplayField && displayField) {
        Object.assign(acc, {
          [`${displayField}.${nestedDisplayField}`]: { ...rest, fieldToQuery: rest.nestedField },
        });
        Object.assign(acc, {
          [`${displayField}`]: rest,
        });
      } else if (displayField) {
        Object.assign(acc, { [displayField]: rest });
      }
      return acc;
    }, enhanceSuggestionsAbstraction.fields),
  };
};
