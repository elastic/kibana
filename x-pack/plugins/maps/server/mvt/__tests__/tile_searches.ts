/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as path from 'path';
import * as fs from 'fs';

const search000path = path.resolve(__dirname, './json/0_0_0_search.json');
const search000raw = fs.readFileSync(search000path);
const search000json = JSON.parse((search000raw as unknown) as string);

export const TILE_SEARCHES = {
  '0.0.0': {
    countResponse: {
      count: 1,
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
