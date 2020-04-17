/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { trackUiMetric } from '../../kibana_services';

export { METRIC_TYPE };

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest<TResponse>(request: Promise<TResponse>, actionType: string) {
  // Only track successful actions.
  return request.then(response => {
    trackUiMetric(METRIC_TYPE.LOADED, actionType);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
