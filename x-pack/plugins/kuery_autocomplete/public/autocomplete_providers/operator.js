/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { flatten } from 'lodash';
const type = 'operator';

const equalsText = i18n.translate('xpack.kueryAutocomplete.equalOperatorDescription.equalsText', {
  defaultMessage: 'equals'
});
const lessThanOrEqualToText = i18n.translate('xpack.kueryAutocomplete.lessThanOrEqualOperatorDescription.lessThanOrEqualToText', {
  defaultMessage: 'less than or equal to'
});
const greaterThanOrEqualToText = i18n.translate('xpack.kueryAutocomplete.greaterThanOrEqualOperatorDescription.greaterThanOrEqualToText', {
  defaultMessage: 'greater than or equal to'
});
const lessThanText = i18n.translate('xpack.kueryAutocomplete.lessThanOperatorDescription.lessThanText', {
  defaultMessage: 'less than'
});
const greaterThanText = i18n.translate('xpack.kueryAutocomplete.greaterThanOperatorDescription.greaterThanText', {
  defaultMessage: 'greater than'
});
const existsText = i18n.translate('xpack.kueryAutocomplete.existOperatorDescription.existsText', {
  defaultMessage: 'exists'
});

const operators = {
  ':': {
    description: i18n.translate('xpack.kueryAutocomplete.equalOperatorDescription', {
      defaultMessage: '{equals} some value',
      values: { equals: '<span class="suggestionItem__callout">' + equalsText + '</span>' },
      description: 'initial version of the string is: "<span class="suggestionItem__callout">equals</span> some value"'
    }),
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape', 'boolean']
  },
  '<=': {
    description: i18n.translate('xpack.kueryAutocomplete.lessThanOrEqualOperatorDescription', {
      defaultMessage: 'is {lessThanOrEqualTo} some value',
      values: { lessThanOrEqualTo: '<span class="suggestionItem__callout">' + lessThanOrEqualToText + '</span>' },
      description: 'initial version of the string is: "is <span class="suggestionItem__callout">less than or equal to</span> some value"'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  '>=': {
    description: i18n.translate('xpack.kueryAutocomplete.greaterThanOrEqualOperatorDescription', {
      defaultMessage: 'is {greaterThanOrEqualTo} some value',
      values: { greaterThanOrEqualTo: '<span class="suggestionItem__callout">' + greaterThanOrEqualToText + '</span>' },
      description:
        'initial version of the string is: "is <span class="suggestionItem__callout">greater than or equal to</span> some value"'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  '<': {
    description: i18n.translate('xpack.kueryAutocomplete.lessThanOperatorDescription', {
      defaultMessage: 'is {lessThan} some value',
      values: { lessThan: '<span class="suggestionItem__callout">' + lessThanText + '</span>' },
      description: 'initial version of the string is: "is <span class="suggestionItem__callout">less than</span> some value"'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  '>': {
    description: i18n.translate('xpack.kueryAutocomplete.greaterThanOperatorDescription', {
      defaultMessage: 'is {greaterThan} some value',
      values: { greaterThan: '<span class="suggestionItem__callout">' + greaterThanText + '</span>' },
      description: 'initial version of the string is: "is <span class="suggestionItem__callout">greater than</span> some value"'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  ':*': {
    description: i18n.translate('xpack.kueryAutocomplete.existOperatorDescription', {
      defaultMessage: '{exists} in any form',
      values: { exists: '<span class="suggestionItem__callout">' + existsText + '</span>' },
      description: 'initial version of the string is: "<span class="suggestionItem__callout">exists</span> in any form"'
    })
  },
};

function getDescription(operator) {
  const { description } = operators[operator];
  return `<p>${description}</p>`;
}

export function getSuggestionsProvider({ indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => indexPattern.fields));
  return function getOperatorSuggestions({ end, fieldName }) {
    const fields = allFields.filter(field => field.name === fieldName);
    return flatten(fields.map(field => {
      const matchingOperators = Object.keys(operators).filter(operator => {
        const { fieldTypes } = operators[operator];
        return !fieldTypes || fieldTypes.includes(field.type);
      });
      const suggestions = matchingOperators.map(operator => {
        const text = operator + ' ';
        const description = getDescription(operator);
        return { type, text, description, start: end, end };
      });
      return suggestions;
    }));
  };
}
