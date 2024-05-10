/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_USAGE_COUNTER_TYPE, API_USAGE_ERROR_TYPE } from '@kbn/reporting-server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';

export type Counters = ReturnType<typeof getCounters>;

/**
 * A helper utility that can be passed around and call the usage counter service
 */
export function getCounters(method: string, path: string, usageCounter: UsageCounter | undefined) {
  return {
    /**
     * constructs a counterName from the API request method and path
     * appends an optional "path suffix" for additional context about filetype, etc
     */
    usageCounter(pathSuffix?: string) {
      const counterName = `${method} ${path}${pathSuffix ? ':' + pathSuffix : ''}`;

      usageCounter?.incrementCounter({
        counterName,
        counterType: API_USAGE_COUNTER_TYPE,
      });
    },

    /**
     * appends `:{statusCode}` to the counterName if there is a statusCode
     */
    errorCounter(pathSuffix?: string, statusCode?: number) {
      let counterName = `${method} ${path}`;
      if (pathSuffix) {
        counterName += `:${pathSuffix}`;
      }
      if (statusCode) {
        counterName += `:${statusCode}`;
      }

      usageCounter?.incrementCounter({
        counterName,
        counterType: API_USAGE_ERROR_TYPE,
      });
    },
  };
}
