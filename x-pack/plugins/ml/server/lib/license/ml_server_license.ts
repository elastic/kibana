/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'src/core/server';

import { MlLicense } from '../../../../../legacy/plugins/ml/common/license';

export class MlServerLicense extends MlLicense {
  public fullLicenseAPIGuard(handler: RequestHandler<any, any, any>) {
    return guard(() => this.isFullLicense(), handler);
  }
  public basicLicenseAPIGuard(handler: RequestHandler<any, any, any>) {
    return guard(() => this.isMinimumLicense(), handler);
  }
}

function guard(check: () => boolean, handler: RequestHandler<any, any, any>) {
  return (
    context: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) => {
    if (check() === false) {
      return response.forbidden();
    }
    return handler(context, request, response);
  };
}
