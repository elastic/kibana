/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  IScopedClusterClient,
  RequestHandler,
  SavedObjectsClientContract,
} from 'kibana/server';
import { SpacesPluginSetup } from '../../../spaces/server';
import type { SecurityPluginSetup } from '../../../security/server';

import { jobSavedObjectServiceFactory, JobSavedObjectService } from '../saved_objects';
import { MlLicense } from '../../common/license';

import { MlClient, getMlClient } from '../lib/ml_client';
import type { AlertingApiRequestHandlerContext } from '../../../alerting/server';

type MLRequestHandlerContext = RequestHandlerContext & {
  alerting?: AlertingApiRequestHandlerContext;
};

type Handler<P = unknown, Q = unknown, B = unknown> = (handlerParams: {
  client: IScopedClusterClient;
  request: KibanaRequest<P, Q, B>;
  response: KibanaResponseFactory;
  context: MLRequestHandlerContext;
  jobSavedObjectService: JobSavedObjectService;
  mlClient: MlClient;
}) => ReturnType<RequestHandler<P, Q, B>>;

type GetMlSavedObjectClient = (request: KibanaRequest) => SavedObjectsClientContract | null;
type GetInternalSavedObjectClient = () => SavedObjectsClientContract | null;

export class RouteGuard {
  private _mlLicense: MlLicense;
  private _getMlSavedObjectClient: GetMlSavedObjectClient;
  private _getInternalSavedObjectClient: GetInternalSavedObjectClient;
  private _spacesPlugin: SpacesPluginSetup | undefined;
  private _authorization: SecurityPluginSetup['authz'] | undefined;
  private _isMlReady: () => Promise<void>;

  constructor(
    mlLicense: MlLicense,
    getSavedObject: GetMlSavedObjectClient,
    getInternalSavedObject: GetInternalSavedObjectClient,
    spacesPlugin: SpacesPluginSetup | undefined,
    authorization: SecurityPluginSetup['authz'] | undefined,
    isMlReady: () => Promise<void>
  ) {
    this._mlLicense = mlLicense;
    this._getMlSavedObjectClient = getSavedObject;
    this._getInternalSavedObjectClient = getInternalSavedObject;
    this._spacesPlugin = spacesPlugin;
    this._authorization = authorization;
    this._isMlReady = isMlReady;
  }

  public fullLicenseAPIGuard<P, Q, B>(handler: Handler<P, Q, B>) {
    return this._guard(() => this._mlLicense.isFullLicense(), handler);
  }
  public basicLicenseAPIGuard<P, Q, B>(handler: Handler<P, Q, B>) {
    return this._guard(() => this._mlLicense.isMinimumLicense(), handler);
  }

  private _guard<P, Q, B>(check: () => boolean, handler: Handler<P, Q, B>) {
    return (
      context: MLRequestHandlerContext,
      request: KibanaRequest<P, Q, B>,
      response: KibanaResponseFactory
    ) => {
      if (check() === false) {
        return response.forbidden();
      }

      const mlSavedObjectClient = this._getMlSavedObjectClient(request);
      const internalSavedObjectsClient = this._getInternalSavedObjectClient();
      if (mlSavedObjectClient === null || internalSavedObjectsClient === null) {
        return response.badRequest({
          body: { message: 'saved object client has not been initialized' },
        });
      }

      const jobSavedObjectService = jobSavedObjectServiceFactory(
        mlSavedObjectClient,
        internalSavedObjectsClient,
        this._spacesPlugin !== undefined,
        this._authorization,
        this._isMlReady
      );
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
