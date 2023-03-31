/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';

export const createHostsFilter = (hostNames: string[]): Filter => {
  return {
    query: {
      terms: {
        'host.name': hostNames,
      },
    },
    meta: {},
  };
};
