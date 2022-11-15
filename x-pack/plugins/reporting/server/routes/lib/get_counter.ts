/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { API_USAGE_COUNTER_TYPE } from '../../../common/constants';

export type Counters = ReturnType<typeof getCounters>;

export function getCounters(method: string, path: string, usageCounter: UsageCounter | undefined) {
  return {
    usageCounter() {
      usageCounter?.incrementCounter({
        counterName: `${method} ${path}`,
        counterType: API_USAGE_COUNTER_TYPE,
      });
    },
    handleError() {
      // TODO call from RequestHandler.handleError
    },
  };
}
