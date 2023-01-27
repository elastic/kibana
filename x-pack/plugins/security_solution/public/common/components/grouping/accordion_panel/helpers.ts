/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createGroupFilter = (selectedGroup: string, query: string) =>
  query && selectedGroup
    ? [
        {
          meta: {
            alias: null,
            disabled: false,
            key: selectedGroup,
            negate: false,
            params: {
              query,
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              [selectedGroup]: {
                query,
              },
            },
          },
        },
      ]
    : [];
