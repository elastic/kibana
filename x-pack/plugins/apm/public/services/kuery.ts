/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { getAutocompleteProvider } from 'ui/autocomplete_providers';
import { StaticIndexPattern } from 'ui/index_patterns';
// @ts-ignore
import { getFromSavedObject } from 'ui/index_patterns/static_utils';
import { getAPMIndexPattern } from './rest/savedObjects';

export function convertKueryToEsQuery(
  kuery: string,
  indexPattern: StaticIndexPattern
) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}

export async function getSuggestions(
  query: string,
  selectionStart: number,
  apmIndexPattern: StaticIndexPattern,
  boolFilter: unknown
) {
  const autocompleteProvider = getAutocompleteProvider('kuery');
  if (!autocompleteProvider) {
    return [];
  }
  const config = {
    get: () => true
  };

  const getAutocompleteSuggestions = autocompleteProvider({
    config,
    indexPatterns: [apmIndexPattern],
    boolFilter
  });
  return getAutocompleteSuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart
  });
}

export async function getAPMIndexPatternForKuery(): Promise<
  StaticIndexPattern | undefined
> {
  const apmIndexPattern = await getAPMIndexPattern();
  if (!apmIndexPattern) {
    return;
  }
  return getFromSavedObject(apmIndexPattern);
}
