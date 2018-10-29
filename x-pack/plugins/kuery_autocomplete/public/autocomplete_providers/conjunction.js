/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const type = 'conjunction';

const conjunctions = {
  and: `<p>Requires <span class="suggestionItem__callout">both arguments</span> to be true</p>`,
  or: `<p>Requires <span class="suggestionItem__callout">one or more arguments</span> to be true</p>`
};

function getDescription(conjunction) {
  return conjunctions[conjunction];
}

export function getSuggestionsProvider() {
  return function getConjunctionSuggestions({ text, end }) {
    if (!text.endsWith(' ')) return [];
    const suggestions = Object.keys(conjunctions).map(conjunction => {
      const text = `${conjunction} `;
      const description = getDescription(conjunction);
      return { type, text, description, start: end, end };
    });
    return suggestions;
  };
}
