/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HttpInterceptor,
  HttpErrorResponse,
  IHttpResponse,
  IAnonymousPaths,
} from 'src/core/public';

import { ISessionTimeout } from './session_timeout';

const isSystemAPIRequest = (request: Request) => {
  return request.headers.has('kbn-system-api');
};

export class SessionTimeoutHttpInterceptor implements HttpInterceptor {
  constructor(private sessionTimeout: ISessionTimeout, private anonymousPaths: IAnonymousPaths) {}

  response(httpResponse: IHttpResponse) {
    if (this.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    if (isSystemAPIRequest(httpResponse.request)) {
      return;
    }

    this.sessionTimeout.extend(httpResponse.request.url);
  }

  responseError(httpErrorResponse: HttpErrorResponse) {
    if (this.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    if (isSystemAPIRequest(httpErrorResponse.request)) {
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
