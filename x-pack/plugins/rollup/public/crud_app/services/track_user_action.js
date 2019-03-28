/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUserActionUri } from '../../../../../common/user_action';
import { UA_APP_NAME } from '../../../common';
import { getHttp } from './http_provider';

export function trackUserAction(actionType) {
  const userActionUri = createUserActionUri(UA_APP_NAME, actionType);
  getHttp().post(userActionUri);
}

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest(request, actionType) {
  // Only track successful actions.
  return request.then(response => {
    trackUserAction(actionType);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
