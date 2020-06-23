/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { UiStatsMetricType, METRIC_TYPE } from '@kbn/analytics';

import { UIM_APP_NAME } from '../constants';

export { METRIC_TYPE };

// usageCollection is an optional dependency, so we default to a no-op.
export let trackUiMetric = (metricType: UiStatsMetricType, eventName: string) => {};

export function init(usageCollection: UsageCollectionSetup): void {
  trackUiMetric = usageCollection.reportUiStats.bind(usageCollection, UIM_APP_NAME);
}

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest(request: Promise<any>, actionType: string) {
  // Only track successful actions.
  return request.then((response) => {
    // It looks like we're using the wrong type here, added via
    // https://github.com/elastic/kibana/pull/41113/files#diff-e65a0a6696a9d723969afd871cbd60cdR19
    // but we'll keep it for now to avoid discontinuity in our telemetry data.
    trackUiMetric(METRIC_TYPE.LOADED, actionType);

    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
