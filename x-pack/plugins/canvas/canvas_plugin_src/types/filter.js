/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filter = () => ({
  name: 'filter',
  from: {
    null: () => {
      return {
        type: 'filter',
        // Any meta data you wish to pass along.
        meta: {},
        // And filters. If you need an "or", create a filter type for it.
        and: [],
      };
    },
  },
});
