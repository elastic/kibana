/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HttpInterceptor,
  HttpSetup,
  HttpErrorResponse,
  HttpInterceptController,
} from 'src/core/public';

export class UnauthorizedResponseInterceptor implements HttpInterceptor {
  constructor(private basePath: HttpSetup['basePath']) {}

  responseError(httpErrorResponse: HttpErrorResponse, controller: HttpInterceptController) {
    // this doesn't work until https://github.com/elastic/kibana/issues/42311 is fixed
    const response = httpErrorResponse.response;
    // if we happen to not have a response, for example if there is no
    // network connectivity, we don't do anything
    if (!response) {
      return;
    }

    // We can't do the following until https://github.com/elastic/kibana/issues/42307 is fixed
    // if the request was omitting credentials it's to an anonymous endpoint
    // (for example to login) and we don't wish to ever redirect
    // if (httpErrorResponse.request.credentials === 'omit') {
    //   return;
    // }

    if (response.status === 401) {
      this.logout();
      controller.halt();
    }
  }

  private logout() {
    const next = this.basePath.remove(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    window.location.href = this.basePath.prepend(
      `/logout?next=${encodeURIComponent(next)}&msg=SESSION_EXPIRED`
    );
  }
}
