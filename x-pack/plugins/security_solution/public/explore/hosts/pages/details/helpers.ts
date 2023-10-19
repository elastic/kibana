/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

export const getHostDetailsPageFilters = (hostName: string): Filter[] => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'host.name',
      value: hostName,
      params: {
        query: hostName,
      },
    },
    query: {
      match: {
        'host.name': {
          query: hostName,
          type: 'phrase',
        },
      },
    },
  },
];
