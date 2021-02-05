/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, RequestHandler, IKibanaResponse, Logger } from 'kibana/server';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

import { ExceptionListClient } from '../../../../../lists/server';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListRequest,
  PostTrustedAppCreateRequest,
  PutTrustedAppsRequestParams,
  PutTrustedAppUpdateRequest,
} from '../../../../common/endpoint/types';

import { EndpointAppContext } from '../../types';
import {
  createTrustedApp,
  deleteTrustedApp,
  getTrustedAppsList,
  getTrustedAppsSummary,
  updateTrustedApp,
} from './service';
import { TrustedAppNotFoundError, TrustedAppVersionConflictError } from './errors';

const exceptionListClientFromContext = (
  context: SecuritySolutionRequestHandlerContext
): ExceptionListClient => {
  const exceptionLists = context.lists?.getExceptionListClient();

  if (!exceptionLists) {
    throw new Error('Exception List client not found');
  }

  return exceptionLists;
};

const errorHandler = <E extends Error>(
  logger: Logger,
  res: KibanaResponseFactory,
  error: E
): IKibanaResponse => {
  logger.error(error);

  if (error instanceof TrustedAppNotFoundError) {
    return res.notFound({ body: error });
  }

  if (error instanceof TrustedAppVersionConflictError) {
    return res.conflict({ body: error });
  }

  return res.internalError({ body: error });
};

export const getTrustedAppsDeleteRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<
  DeleteTrustedAppsRequestParams,
  unknown,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      await deleteTrustedApp(exceptionListClientFromContext(context), req.params);

      return res.ok();
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};

export const getTrustedAppsListRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<
  unknown,
  GetTrustedAppsListRequest,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await getTrustedAppsList(exceptionListClientFromContext(context), req.query),
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};

export const getTrustedAppsCreateRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<
  unknown,
  unknown,
  PostTrustedAppCreateRequest,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await createTrustedApp(exceptionListClientFromContext(context), req.body),
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};

export const getTrustedAppsUpdateRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<
  PutTrustedAppsRequestParams,
  unknown,
  PutTrustedAppUpdateRequest,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await updateTrustedApp(
          exceptionListClientFromContext(context),
          req.params.id,
          req.body
        ),
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};

export const getTrustedAppsSummaryRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, unknown, unknown, SecuritySolutionRequestHandlerContext> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await getTrustedAppsSummary(exceptionListClientFromContext(context)),
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};
