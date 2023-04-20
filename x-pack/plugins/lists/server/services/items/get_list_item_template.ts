/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import listsItemsMappings from './list_item_mappings.json';

export const getListItemTemplate = (index: string): Record<string, unknown> => {
  const template = {
    index_patterns: [`${index}-*`],
    // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
    // then newly created indices will use the matching template with the *longest* namespace
    priority: namespace.length,
    template: {
      mappings: listsItemsMappings,
      settings: {
        index: {
          lifecycle: {
            name: index,
            rollover_alias: index,
          },
        },
        mapping: {
          total_fields: {
            limit: 10000,
          },
        },
      },
    },
  };
  return template;
};
