/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequestHandlerContext } from '../../../../../src/core/server';
import type { IScopedClusterClient } from '../../../../../src/core/server/elasticsearch/client/scoped_cluster_client';
import { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type { KibanaResponseFactory } from '../../../../../src/core/server/http/router/response';
import type { RequestHandler } from '../../../../../src/core/server/http/router/router';
import type { SavedObjectsClientContract } from '../../../../../src/core/server/saved_objects/types';
import type { AlertingApiRequestHandlerContext } from '../../../alerting/server/types';
import type { SecurityPluginSetup } from '../../../security/server/plugin';
import type { SpacesPluginSetup } from '../../../spaces/server/plugin';
import { MlLicense } from '../../common/license/ml_license';
import type { JobSavedObjectService } from '../saved_objects/service';
import { jobSavedObjectServiceFactory } from '../saved_objects/service';
import { getMlClient } from './ml_client/ml_client';
import type { MlClient } from './ml_client/types';

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
