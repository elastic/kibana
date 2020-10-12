/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as path from 'path';
import * as fs from 'fs';

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
    searchResponse: loadJson('./json/0_0_0_search.json'),
  },
};

export const TILE_GRIDAGGS = {
  '0.0.0': {
    gridAggResponse: loadJson('./json/0_0_0_gridagg.json'),
  },
};

function loadJson(filePath: string) {
  const absolutePath = path.resolve(__dirname, filePath);
  const rawContents = fs.readFileSync(absolutePath);
  return JSON.parse((rawContents as unknown) as string);
}
