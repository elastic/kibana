/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TableSortingExpressionFunction } from './types';

export const tableSorting: TableSortingExpressionFunction = {
  name: 'lens_table_sorting',
  type: 'datatable',
  help: '',
  args: {
    type: {
      types: ['string'],
      help: '',
      required: true,
      multi: true,
    },
    columnId: {
      types: ['string'],
      help: '',
      multi: true,
    },
    direction: {
      types: ['string'],
      help: '',
      multi: true,
    },
    terms: {
      types: ['string'],
      help: '',
      multi: true,
    },
  },
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { tableSortingFn } = await import('./table_sorting_fn');
    return tableSortingFn(...args);
  },
};
