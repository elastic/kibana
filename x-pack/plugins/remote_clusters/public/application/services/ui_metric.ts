/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { UIM_APP_NAME } from '../constants';

export let usageCollection: UsageCollectionSetup | undefined;

export function init(_usageCollection: UsageCollectionSetup): void {
  usageCollection = _usageCollection;
}

export function trackUiMetric(type: 'COUNT' | 'CLICK' | 'LOADED', name: string) {
  if (!usageCollection) {
    return;
  }
  const { reportUiStats, METRIC_TYPE } = usageCollection;
  reportUiStats(UIM_APP_NAME, METRIC_TYPE[type], name);
}

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest(request: Promise<any>, eventName: string) {
  // Only track successful actions.
  return request.then((response: any) => {
    trackUiMetric('COUNT', eventName);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
