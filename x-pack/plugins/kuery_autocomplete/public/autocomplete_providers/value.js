/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'isomorphic-fetch';
import { flatten, memoize } from 'lodash';
import { escapeQuotes } from './escape_kuery';
import { kfetch } from 'ui/kfetch';

const type = 'value';

const requestSuggestions = memoize((query, field, boolFilter) => {
  return kfetch({
    pathname: `/api/kibana/suggestions/values/${field.indexPatternTitle}`,
    method: 'POST',
    body: JSON.stringify({ query, field: field.name, boolFilter }),
  });
}, resolver);

export function getSuggestionsProvider({ config, indexPatterns, boolFilter }) {
  const allFields = flatten(
    indexPatterns.map(indexPattern => {
      return indexPattern.fields.map(field => ({
        ...field,
        indexPatternTitle: indexPattern.title,
      }));
    })
  );
  const shouldSuggestValues = config.get('filterEditor:suggestValues');

  return function getValueSuggestions({
    start,
    end,
    prefix,
    suffix,
    fieldName,
  }) {
    const fields = allFields.filter(field => field.name === fieldName);
    const query = `${prefix}${suffix}`;

    const suggestionsByField = fields.map(field => {
      if (field.type === 'boolean') {
        return wrapAsSuggestions(start, end, query, ['true', 'false']);
      } else if (
        !shouldSuggestValues ||
        !field.aggregatable ||
        field.type !== 'string'
      ) {
        return [];
      }

      return requestSuggestions(query, field, boolFilter).then(data => {
        const quotedValues = data.map(value => `"${escapeQuotes(value)}"`);
        return wrapAsSuggestions(start, end, query, quotedValues);
      });
    });

    return Promise.all(suggestionsByField).then(suggestions =>
      flatten(suggestions)
    );
  };
}

function wrapAsSuggestions(start, end, query, values) {
  return values
    .filter(value => value.toLowerCase().includes(query.toLowerCase()))
    .map(value => {
      const text = `${value} `;
      return { type, text, start, end };
    });
}

function resolver(query, field, boolFilter) {
  // Only cache results for a minute
  const ttl = Math.floor(Date.now() / 1000 / 60);
  return [ttl, query, field.indexPatternTitle, field.name, JSON.stringify(boolFilter)].join('|');
}
