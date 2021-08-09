/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export interface IlmPolicy {
  policy: estypes.IlmPolicy;
}

export const defaultIlmPolicy: IlmPolicy = {
  policy: {
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          rollover: {
            max_age: '90d',
            max_size: '50gb',
          },
        },
      },
      delete: {
        actions: {
          delete: {},
        },
      },
    },
  },
};
