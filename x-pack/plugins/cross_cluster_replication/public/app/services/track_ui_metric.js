/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUiMetricUri } from '../../../../../common/ui_metric';
import { UIM_APP_NAME } from '../constants';
import { getHttpClient } from './api';

export function trackUiMetric(actionType) {
  const uiMetricUri = createUiMetricUri(UIM_APP_NAME, actionType);
  getHttpClient().post(uiMetricUri);
}

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest(request, actionType) {
  // Only track successful actions.
  return request.then(response => {
    trackUiMetric(actionType);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
