/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initSpacesOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';

export function initSpacesRequestInterceptors(server: any) {
  initSpacesOnRequestInterceptor(server);
  initSpacesOnPostAuthRequestInterceptor(server);
}
