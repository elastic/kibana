/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  IScopedClusterClient,
  RequestHandler,
} from 'kibana/server';

import { MlLicense } from '../../../common/license';

type Handler = (handlerParams: {
  client: IScopedClusterClient;
  request: KibanaRequest<any, any, any, any>;
  response: KibanaResponseFactory;
  context: RequestHandlerContext;
}) => ReturnType<RequestHandler>;

export class MlServerLicense extends MlLicense {
  public fullLicenseAPIGuard(handler: Handler) {
    return guard(() => this.isFullLicense(), handler);
  }
  public basicLicenseAPIGuard(handler: Handler) {
    return guard(() => this.isMinimumLicense(), handler);
  }
}

function guard(check: () => boolean, handler: Handler) {
  return (
    context: RequestHandlerContext,
    request: KibanaRequest<any, any, any, any>,
    response: KibanaResponseFactory
  ) => {
    if (check() === false) {
      return response.forbidden();
    }

    return handler({
      client: context.core.elasticsearch.client,
      request,
      response,
      context,
    });
  };
}
