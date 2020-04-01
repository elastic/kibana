/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { UiStatsMetricType } from '@kbn/analytics';
import { UIM_APP_NAME } from '../constants';

export let trackUiMetric: (metricType: UiStatsMetricType, eventName: string) => void;
export let METRIC_TYPE: UsageCollectionSetup['METRIC_TYPE'];

export function init(usageCollection: UsageCollectionSetup): void {
  trackUiMetric = usageCollection.reportUiStats.bind(usageCollection, UIM_APP_NAME);
  METRIC_TYPE = usageCollection.METRIC_TYPE;
}

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest(request: Promise<any>, eventName: string) {
  // Only track successful actions.
  return request.then((response: any) => {
    trackUiMetric(METRIC_TYPE.COUNT, eventName);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
