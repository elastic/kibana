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
  SavedObjectsClientContract,
} from 'kibana/server';

import { jobSavedObjectServiceFactory, JobSavedObjectService } from '../saved_objects';
import { MlLicense } from '../../common/license';

import { MlClient, getMlClient } from '../lib/ml_client';

type Handler = (handlerParams: {
  client: IScopedClusterClient;
  request: KibanaRequest<any, any, any, any>;
  response: KibanaResponseFactory;
  context: RequestHandlerContext;
  jobSavedObjectService: JobSavedObjectService;
  mlClient: MlClient;
}) => ReturnType<RequestHandler>;

type GetSavedObjectClient = (request: KibanaRequest) => SavedObjectsClientContract;

export class RouteGuard {
  private _mlLicense: MlLicense;
  private _getSavedObjectClient: GetSavedObjectClient;

  constructor(mlLicense: MlLicense, getSavedObject: GetSavedObjectClient) {
    this._mlLicense = mlLicense;
    this._getSavedObjectClient = getSavedObject;
  }

  public fullLicenseAPIGuard(handler: Handler) {
    if (this._getSavedObjectClient === null) {
      throw new Error();
    }
    return this._guard(() => this._mlLicense.isFullLicense(), handler);
  }
  public basicLicenseAPIGuard(handler: Handler) {
    if (this._getSavedObjectClient === null) {
      throw new Error();
    }
    return this._guard(() => this._mlLicense.isMinimumLicense(), handler);
  }

  private _guard(check: () => boolean, handler: Handler) {
    return (
      context: RequestHandlerContext,
      request: KibanaRequest<any, any, any, any>,
      response: KibanaResponseFactory
    ) => {
      if (check() === false) {
        return response.forbidden();
      }

      const savedObjectClient = this._getSavedObjectClient(request);
      const jobSavedObjectService = jobSavedObjectServiceFactory(savedObjectClient);
      const client = context.core.elasticsearch.client;

      return handler({
        client,
        request,
        response,
        context,
        jobSavedObjectService,
        mlClient: getMlClient(client, jobSavedObjectService),
      });
    };
  }
}
