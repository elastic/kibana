/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpInterceptor, HttpErrorResponse, HttpResponse } from 'src/core/public';

import { AnonymousPaths } from '../anonymous_paths';
import { ISessionTimeout } from './session_timeout';

const isSystemAPIRequest = (request?: Request) => {
  if (request == null) {
    // TODO: How is is request potentially undefined here???
    return false;
  }
  return request.headers.has('kbn-system-api');
};

export class SessionTimeoutHttpInterceptor implements HttpInterceptor {
  constructor(private sessionTimeout: ISessionTimeout, private anonymousPaths: AnonymousPaths) {}

  response(httpResponse: HttpResponse) {
    if (this.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    if (isSystemAPIRequest(httpResponse.request)) {
      return;
    }

    this.sessionTimeout.extend();
  }

  responseError(httpErrorResponse: HttpErrorResponse) {
    if (this.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    if (isSystemAPIRequest(httpErrorResponse.request)) {
      return;
    }

    this.sessionTimeout.extend();
  }
}
