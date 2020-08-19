/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import search000json = require('./json/0_0_0_search.json'); // Prefer require() over setting the compiler options, which affect production modules as well

export const TILE_SEARCHES = {
  '0.0.0': {
    countResponse: {
      count: 250,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
    },
    searchResponse: search000json,
  },
  '1.1.0': {},
};
