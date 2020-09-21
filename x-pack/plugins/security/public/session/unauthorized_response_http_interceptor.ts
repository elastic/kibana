/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HttpInterceptor,
  HttpInterceptorResponseError,
  IHttpInterceptController,
  HttpInterceptorToolkit,
} from 'src/core/public';

import { SessionExpired } from './session_expired';

export class UnauthorizedResponseHttpInterceptor implements HttpInterceptor {
  constructor(private sessionExpired: SessionExpired) {}

  responseError(
    httpErrorResponse: HttpInterceptorResponseError,
    controller: IHttpInterceptController,
    toolkit: HttpInterceptorToolkit
  ) {
    if (toolkit.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    // if the request was omitting credentials it's to an anonymous endpoint
    // (for example to login) and we don't wish to ever redirect
    if (httpErrorResponse.request.credentials === 'omit') {
      return;
    }

    // if we happen to not have a response, for example if there is no
    // network connectivity, we don't do anything
    const { response } = httpErrorResponse;
    if (!response) {
      return;
    }

    if (response.status === 401) {
      this.sessionExpired.logout();
      controller.halt();
    }
  }
}
