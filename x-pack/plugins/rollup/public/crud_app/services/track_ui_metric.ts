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
  return request.then((response) => {
    // NOTE: METRIC_TYPE.LOADED is probably the wrong metric type here. The correct metric type
    // is more likely METRIC_TYPE.APPLICATION_USAGE. This change was introduced in
    // https://github.com/elastic/kibana/pull/41113/files#diff-58ac12bdd1a3a05a24e69ff20633c482R20
    trackUiMetric(METRIC_TYPE.LOADED, actionType);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
