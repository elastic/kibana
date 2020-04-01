/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HttpInterceptor,
  HttpInterceptorResponseError,
  HttpResponse,
  IAnonymousPaths,
} from 'src/core/public';

import { ISessionTimeout } from './session_timeout';

export class SessionTimeoutHttpInterceptor implements HttpInterceptor {
  constructor(private sessionTimeout: ISessionTimeout, private anonymousPaths: IAnonymousPaths) {}

  response(httpResponse: HttpResponse) {
    if (this.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    if (httpResponse.fetchOptions.asSystemRequest) {
      return;
    }

    this.sessionTimeout.extend(httpResponse.request.url);
  }

  responseError(httpErrorResponse: HttpInterceptorResponseError) {
    if (this.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    if (httpErrorResponse.fetchOptions.asSystemRequest) {
      return;
    }

    // if we happen to not have a response, for example if there is no
    // network connectivity, we won't extend the session because there
    // won't be a response with a set-cookie header, which is required
    // to extend the session
    const { response } = httpErrorResponse;
    if (!response) {
      return;
    }

    this.sessionTimeout.extend(httpErrorResponse.request.url);
  }
}
