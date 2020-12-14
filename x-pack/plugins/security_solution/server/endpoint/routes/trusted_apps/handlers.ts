/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, RequestHandlerContext } from 'kibana/server';

import { ExceptionListClient } from '../../../../../lists/server';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListRequest,
  PostTrustedAppCreateRequest,
} from '../../../../common/endpoint/types';

import { EndpointAppContext } from '../../types';
import {
  createTrustedApp,
  deleteTrustedApp,
  getTrustedAppsList,
  MissingTrustedAppException,
} from './service';

const exceptionListClientFromContext = (context: RequestHandlerContext): ExceptionListClient => {
  const exceptionLists = context.lists?.getExceptionListClient();

  if (!exceptionLists) {
    throw new Error('Exception List client not found');
  }

  return exceptionLists;
};

export const getTrustedAppsDeleteRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<DeleteTrustedAppsRequestParams, undefined, undefined> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      await deleteTrustedApp(exceptionListClientFromContext(context), req.params);

      return res.ok();
    } catch (error) {
      if (error instanceof MissingTrustedAppException) {
        return res.notFound({ body: `trusted app id [${req.params.id}] not found` });
      } else {
        logger.error(error);
        return res.internalError({ body: error });
      }
    }
  };
};

export const getTrustedAppsListRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, GetTrustedAppsListRequest> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await getTrustedAppsList(exceptionListClientFromContext(context), req.query),
      });
    } catch (error) {
      logger.error(error);
      return res.internalError({ body: error });
    }
  };
};

export const getTrustedAppsCreateRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, undefined, PostTrustedAppCreateRequest> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await createTrustedApp(exceptionListClientFromContext(context), req.body),
      });
    } catch (error) {
      logger.error(error);
      return res.internalError({ body: error });
    }
  };
};
