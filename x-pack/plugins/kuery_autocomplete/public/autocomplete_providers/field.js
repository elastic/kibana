/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { escape, flatten } from 'lodash';
import { escapeKuery } from './escape_kuery';
import { sortPrefixFirst } from 'ui/utils/sort_prefix_first';
import { isFilterable } from 'ui/index_patterns/static_utils';


const type = 'field';

function getDescription(fieldName) {
  return `<p>Filter results that contain <span class="suggestionItem__callout">${escape(fieldName)}</span></p>`;
}

export function getSuggestionsProvider({ indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => indexPattern.fields));
  return function getFieldSuggestions({ start, end, prefix, suffix }) {
    const search = `${prefix}${suffix}`.toLowerCase();
    const filterableFields = allFields.filter(isFilterable);
    const fieldNames = filterableFields.map(field => field.name);
    const matchingFieldNames = fieldNames.filter(name => name.toLowerCase().includes(search));
    const sortedFieldNames = sortPrefixFirst(matchingFieldNames.sort(keywordComparator), search);
    const suggestions = sortedFieldNames.map(fieldName => {
      const text = `${escapeKuery(fieldName)} `;
      const description = getDescription(fieldName);
      return { type, text, description, start, end };
    });
    return suggestions;
  };
}

function keywordComparator(first, second) {
  const extensions = ['raw', 'keyword'];
  if (extensions.map(ext => `${first}.${ext}`).includes(second)) {
    return 1;
  } else if (extensions.map(ext => `${second}.${ext}`).includes(first)) {
    return -1;
  }
  return first.localeCompare(second);
}
