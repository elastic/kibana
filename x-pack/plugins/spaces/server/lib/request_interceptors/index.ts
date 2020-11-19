/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initSpacesOnRequestInterceptor, OnRequestInterceptorDeps } from './on_request_interceptor';
import {
  initSpacesOnPostAuthRequestInterceptor,
  OnPostAuthInterceptorDeps,
} from './on_post_auth_interceptor';

export type InterceptorDeps = OnRequestInterceptorDeps & OnPostAuthInterceptorDeps;

export function initSpacesRequestInterceptors(deps: InterceptorDeps) {
  initSpacesOnRequestInterceptor(deps);
  initSpacesOnPostAuthRequestInterceptor(deps);
}
