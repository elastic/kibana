/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

/**
 * API versioning references
 */
export const apiVersion = deepFreeze({
  public: {
    v8_11_0: '2023-10-31',
    // Temporary work-around until kibana core allows other values to be used
    v8_13_0: '2023-10-31', // '2024-03-12',
  },
} as const);
