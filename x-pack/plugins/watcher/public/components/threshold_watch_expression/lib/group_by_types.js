/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const groupByTypes = {
  'all': {
    label: 'all documents',
    sizeRequired: false,
    value: 'all',
    validNormalizedTypes: []
  },
  'top': {
    label: 'top',
    sizeRequired: true,
    value: 'top',
    validNormalizedTypes: ['number', 'date', 'keyword']
  }
};
