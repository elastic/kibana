/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmPolicy } from '../definition';

export const defaultIlmPolicy: IlmPolicy = {
  phases: {
    hot: {
      min_age: '0ms',
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
        },
        set_priority: {
          priority: 100,
        },
      },
    },
    delete: {
      actions: {
        delete: {},
      },
    },
  },
};
