/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

export const defaultAlertsFilters: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'event.kind',
    params: {
      query: 'alert',
    },
  },
  query: {
    bool: {
      filter: [
        {
          bool: {
            should: [
              {
                match: {
                  'event.kind': 'alert',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  },
};
