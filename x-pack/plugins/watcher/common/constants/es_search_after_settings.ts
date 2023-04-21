/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_SEARCH_AFTER_SETTINGS: {
  PAGE_SIZE: number;
  SORT_FIELD: string;
  SORT: any;
} = {
  // How many results to return per search call
  PAGE_SIZE: 10,

  // On what field to sort the results
  SORT_FIELD: '_seq_no',

  // Sort definition
  SORT: [
    {
      _seq_no: {
        order: 'asc',
      },
    },
  ],
};
