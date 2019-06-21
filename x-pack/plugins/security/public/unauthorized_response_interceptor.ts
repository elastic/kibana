/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpInterceptor, HttpSetup } from 'kibana/public';

export class UnauthorizedResponseInterceptor implements HttpInterceptor {
  constructor(private basePath: HttpSetup['basePath']) {}

  responseError(httpErrorResponse, controller) {
    const response = httpErrorResponse.error.response;
    if (!response) {
      return;
    }

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
