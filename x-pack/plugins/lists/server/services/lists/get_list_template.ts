/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import listMappings from './list_mappings.json';

export const getListTemplate = (index: string): Record<string, unknown> => ({
  index_patterns: [`${index}-*`],
  mappings: listMappings,
  settings: {
    index: {
      lifecycle: {
        name: index,
        rollover_alias: index,
      },
    },
  },
});
