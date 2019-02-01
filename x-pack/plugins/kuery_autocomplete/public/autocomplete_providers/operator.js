/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { flatten } from 'lodash';
const type = 'operator';

const equalsText = i18n.translate('xpack.kueryAutocomplete.equalOperatorDescription.equalsText', {
  defaultMessage: 'equals',
  description: 'Part of xpack.kueryAutocomplete.equalOperatorDescription. Full text: "equals some value"'
});
const lessThanOrEqualToText = i18n.translate('xpack.kueryAutocomplete.lessThanOrEqualOperatorDescription.lessThanOrEqualToText', {
  defaultMessage: 'less than or equal to',
  description: 'Part of xpack.kueryAutocomplete.lessThanOrEqualOperatorDescription. Full text: "is less than or equal to some value"'
});
const greaterThanOrEqualToText = i18n.translate('xpack.kueryAutocomplete.greaterThanOrEqualOperatorDescription.greaterThanOrEqualToText', {
  defaultMessage: 'greater than or equal to',
  description: 'Part of xpack.kueryAutocomplete.greaterThanOrEqualOperatorDescription. Full text: "is greater than or equal to some value"'
});
const lessThanText = i18n.translate('xpack.kueryAutocomplete.lessThanOperatorDescription.lessThanText', {
  defaultMessage: 'less than',
  description: 'Part of xpack.kueryAutocomplete.lessThanOperatorDescription. Full text: "is less than some value"'
});
const greaterThanText = i18n.translate('xpack.kueryAutocomplete.greaterThanOperatorDescription.greaterThanText', {
  defaultMessage: 'greater than',
  description: 'Part of xpack.kueryAutocomplete.greaterThanOperatorDescription. Full text: "is greater than some value"'
});
const existsText = i18n.translate('xpack.kueryAutocomplete.existOperatorDescription.existsText', {
  defaultMessage: 'exists',
  description: 'Part of xpack.kueryAutocomplete.existOperatorDescription. Full text: "exists in any form"'
});

const operators = {
  ':': {
    description: i18n.translate('xpack.kueryAutocomplete.equalOperatorDescription', {
      defaultMessage: '{equals} some value',
      values: { equals: `<span class="suggestionItem__callout">${equalsText}</span>` },
      description: 'Full text: "equals some value". See ' +
      'xpack.kueryAutocomplete.equalOperatorDescription.equalsText for "equals" part.'
    }),
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape', 'boolean']
  },
  '<=': {
    description: i18n.translate('xpack.kueryAutocomplete.lessThanOrEqualOperatorDescription', {
      defaultMessage: 'is {lessThanOrEqualTo} some value',
      values: { lessThanOrEqualTo: `<span class="suggestionItem__callout">${lessThanOrEqualToText}</span>` },
      description: 'Full text: "is less than or equal to some value". See ' +
      'xpack.kueryAutocomplete.lessThanOrEqualOperatorDescription.lessThanOrEqualToText for "less than or equal to" part.'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  '>=': {
    description: i18n.translate('xpack.kueryAutocomplete.greaterThanOrEqualOperatorDescription', {
      defaultMessage: 'is {greaterThanOrEqualTo} some value',
      values: { greaterThanOrEqualTo: `<span class="suggestionItem__callout">${greaterThanOrEqualToText}</span>` },
      description: 'Full text: "is greater than or equal to some value". See ' +
      'xpack.kueryAutocomplete.greaterThanOrEqualOperatorDescription.greaterThanOrEqualToText for "greater than or equal to" part.'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  '<': {
    description: i18n.translate('xpack.kueryAutocomplete.lessThanOperatorDescription', {
      defaultMessage: 'is {lessThan} some value',
      values: { lessThan: `<span class="suggestionItem__callout">${lessThanText}</span>` },
      description: 'Full text: "is less than some value". See ' +
      'xpack.kueryAutocomplete.lessThanOperatorDescription.lessThanText for "less than" part.'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  '>': {
    description: i18n.translate('xpack.kueryAutocomplete.greaterThanOperatorDescription', {
      defaultMessage: 'is {greaterThan} some value',
      values: { greaterThan: `<span class="suggestionItem__callout">${greaterThanText}</span>` },
      description: 'Full text: "is greater than some value". See ' +
      'xpack.kueryAutocomplete.greaterThanOperatorDescription.greaterThanText for "greater than" part.'
    }),
    fieldTypes: ['number', 'date', 'ip']
  },
  ':*': {
    description: i18n.translate('xpack.kueryAutocomplete.existOperatorDescription', {
      defaultMessage: '{exists} in any form',
      values: { exists: `<span class="suggestionItem__callout">${existsText}</span>` },
      description: 'Full text: "exists in any form". See ' +
      'xpack.kueryAutocomplete.existOperatorDescription.existsText for "exists" part.'
    })
  },
};

function getDescription(operator) {
  const { description } = operators[operator];
  return `<p>${description}</p>`;
}

export function getSuggestionsProvider({ indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => {
    return indexPattern.fields.slice();
  }));
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
