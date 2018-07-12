/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery } from 'ui/kuery';
import { getAutocompleteProvider } from 'ui/autocomplete_providers';

export function convertKueryToEsQuery(kuery, indexPattern) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}

export async function getSuggestions(
  query,
  selectionStart,
  apmIndexPattern,
  boolFilter
) {
  const getSuggestionsProvider = getAutocompleteProvider('kuery');
  if (!getSuggestionsProvider) return [];
  const config = {
    get: () => true
  };

  const getKuerySuggestions = getSuggestionsProvider({
    config,
    indexPatterns: [apmIndexPattern],
    boolFilter
  });
  return getKuerySuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart
  });
}
