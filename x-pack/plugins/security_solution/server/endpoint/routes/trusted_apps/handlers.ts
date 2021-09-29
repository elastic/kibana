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
  GetOneTrustedAppRequestParams,
  GetTrustedAppsListRequest,
  PostTrustedAppCreateRequest,
  PutTrustedAppsRequestParams,
  PutTrustedAppUpdateRequest,
  GetTrustedAppsSummaryRequest,
} from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';

import {
  createTrustedApp,
  deleteTrustedApp,
  getTrustedApp,
  getTrustedAppsList,
  getTrustedAppsSummary,
  updateTrustedApp,
} from './service';
import {
  TrustedAppNotFoundError,
  TrustedAppVersionConflictError,
  TrustedAppPolicyNotExistsError,
} from './errors';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { EndpointLicenseError } from '../../errors';

const getBodyAfterFeatureFlagCheck = (
  body: PutTrustedAppUpdateRequest | PostTrustedAppCreateRequest,
  endpointAppContext: EndpointAppContext
): PutTrustedAppUpdateRequest | PostTrustedAppCreateRequest => {
  const isTrustedAppsByPolicyEnabled =
    endpointAppContext.experimentalFeatures.trustedAppsByPolicyEnabled;
  return {
    ...body,
    ...(isTrustedAppsByPolicyEnabled ? body.effectScope : { effectSctope: { type: 'policy:all' } }),
  };
};

const exceptionListClientFromContext = (
  context: SecuritySolutionRequestHandlerContext
): ExceptionListClient => {
  const exceptionLists = context.lists?.getExceptionListClient();

  if (!exceptionLists) {
    throw new Error('Exception List client not found');
  }

  return exceptionLists;
};

const packagePolicyClientFromEndpointContext = (
  endpointAppContext: EndpointAppContext
): PackagePolicyServiceInterface => {
  const packagePolicy = endpointAppContext.service.getPackagePolicyService();

  if (!packagePolicy) {
    throw new Error('Package policy service not found');
  }

  return packagePolicy;
};

const errorHandler = <E extends Error>(
  logger: Logger,
  res: KibanaResponseFactory,
  error: E
): IKibanaResponse => {
  if (error instanceof TrustedAppNotFoundError) {
    logger.error(error);
    return res.notFound({ body: error });
  }

  if (error instanceof TrustedAppPolicyNotExistsError) {
    logger.error(error);
    return res.badRequest({ body: { message: error.message, attributes: { type: error.type } } });
  }

  if (error instanceof EndpointLicenseError) {
    logger.error(error);
    return res.badRequest({ body: { message: error.message, attributes: { type: error.name } } });
  }

  if (error instanceof TrustedAppVersionConflictError) {
    logger.error(error);
    return res.conflict({ body: error });
  }

  // Kibana will take care of `500` errors when the handler `throw`'s, including logging the error
  throw error;
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

export const getTrustedAppsGetOneHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<
  GetOneTrustedAppRequestParams,
  unknown,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await getTrustedApp(exceptionListClientFromContext(context), req.params.id),
      });
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
      const body = getBodyAfterFeatureFlagCheck(req.body, endpointAppContext);

      return res.ok({
        body: await createTrustedApp(
          exceptionListClientFromContext(context),
          context.core.savedObjects.client,
          packagePolicyClientFromEndpointContext(endpointAppContext),
          body,
          endpointAppContext.service.getLicenseService().isAtLeast('platinum')
        ),
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
      const body = getBodyAfterFeatureFlagCheck(req.body, endpointAppContext);

      return res.ok({
        body: await updateTrustedApp(
          exceptionListClientFromContext(context),
          context.core.savedObjects.client,
          packagePolicyClientFromEndpointContext(endpointAppContext),
          req.params.id,
          body,
          endpointAppContext.service.getLicenseService().isAtLeast('platinum')
        ),
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};

export const getTrustedAppsSummaryRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<
  unknown,
  GetTrustedAppsSummaryRequest,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      return res.ok({
        body: await getTrustedAppsSummary(exceptionListClientFromContext(context), req.query),
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};
