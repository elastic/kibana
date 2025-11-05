/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { INDEXING_DELAY } from '../../constants';

export const createTransactionMetric = (override: Record<string, any>) => {
  const now = Date.now();
  const time = now - INDEXING_DELAY;

  return merge(
    {
      '@timestamp': new Date(time).toISOString(),
      service: {
        name: 'opbeans-go',
      },
      event: {
        outcome: 'success',
      },
      transaction: {
        duration: {
          histogram: {
            values: [1000000],
            counts: [1],
          },
        },
        type: 'request',
      },
      processor: {
        event: 'metric',
      },
      observer: {
        version_major: 7,
      },
    },
    override
  );
};
