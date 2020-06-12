/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import listsItemsMappings from './list_item_mappings.json';

export const getListItemTemplate = (index: string): Record<string, unknown> => {
  const template = {
    index_patterns: [`${index}-*`],
    mappings: listsItemsMappings,
    settings: {
      index: {
        lifecycle: {
          name: index,
          rollover_alias: index,
        },
      },
    },
  };
  return template;
};
