/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const type = 'conjunction';

const bothArgumentsText = i18n.translate('xpack.kueryAutocomplete.andOperatorDescription.bothArgumentsText', {
  defaultMessage: 'both arguments'
});
const oneOrMoreArgumentsText = i18n.translate('xpack.kueryAutocomplete.orOperatorDescription.oneOrMoreArgumentsText', {
  defaultMessage: 'one or more arguments'
});

const conjunctions = {
  and: '<p>' +
    i18n.translate('xpack.kueryAutocomplete.andOperatorDescription', {
      defaultMessage: 'Requires {bothArguments} to be true',
      values: { bothArguments: '<span class="suggestionItem__callout">' + bothArgumentsText + '</span>' },
      description: 'initial version of the string is: "Requires <span class="suggestionItem__callout">both arguments</span> to be true"'
    }) +
    '</p>',
  or: '<p>' +
    i18n.translate('xpack.kueryAutocomplete.orOperatorDescription', {
      defaultMessage: 'Requires {oneOrMoreArguments} to be true',
      values: { oneOrMoreArguments: '<span class="suggestionItem__callout">' + oneOrMoreArgumentsText + '</span>' },
      description:
        'initial version of the string is: "Requires <span class="suggestionItem__callout">one or more arguments</span> to be true"'
    }) +
    '</p>'
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
