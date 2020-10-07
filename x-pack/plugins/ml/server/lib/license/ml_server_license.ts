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

import { filterJobIdsFactory, JobsInSpaces } from '../../saved_objects/filter';
import { MlLicense } from '../../../common/license';

import { MlClient, getMlClient } from '../ml_client';

type Handler = (handlerParams: {
  client: IScopedClusterClient;
  request: KibanaRequest<any, any, any, any>;
  response: KibanaResponseFactory;
  context: RequestHandlerContext;
  jobsInSpaces: JobsInSpaces;
  mlClient: MlClient;
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

    const jobsInSpaces = filterJobIdsFactory(context.core.savedObjects.client);
    const client = context.core.elasticsearch.client;

    return handler({
      client,
      request,
      response,
      context,
      jobsInSpaces,
      mlClient: getMlClient(client, jobsInSpaces),
    });
  };
}
