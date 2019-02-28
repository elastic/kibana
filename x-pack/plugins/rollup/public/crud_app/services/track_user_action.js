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

export function trackUserRequest(request, actionType) {
  // Only track successful actions.
  request.then(() => trackUserAction(actionType));
  return request;
}
