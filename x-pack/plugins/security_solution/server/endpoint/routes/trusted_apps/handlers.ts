/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from 'kibana/server';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

import { ExceptionListClient } from '../../../../../lists/server';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListRequest,
  PostTrustedAppCreateRequest,
} from '../../../../common/endpoint/types';

import {
  createTrustedApp,
  deleteTrustedApp,
  getTrustedAppsList,
  getTrustedAppsSummary,
  MissingTrustedAppException,
} from './service';

const exceptionListClientFromContext = (
  context: SecuritySolutionRequestHandlerContext
): ExceptionListClient => {
  const exceptionLists = context.lists?.getExceptionListClient();

  if (!exceptionLists) {
    throw new Error('Exception List client not found');
  }

  return exceptionLists;
};

export const getTrustedAppsDeleteRouteHandler = (): RequestHandler<
  DeleteTrustedAppsRequestParams,
  unknown,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, req, res) => {
    try {
      await deleteTrustedApp(exceptionListClientFromContext(context), req.params);

      return res.ok();
    } catch (error) {
      if (error instanceof MissingTrustedAppException) {
        return res.notFound({ body: `trusted app id [${req.params.id}] not found` });
      } else {
        throw error;
      }
    }
  };
};

export const getTrustedAppsListRouteHandler = (): RequestHandler<
  unknown,
  GetTrustedAppsListRequest,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, req, res) => {
    return res.ok({
      body: await getTrustedAppsList(exceptionListClientFromContext(context), req.query),
    });
  };
};

export const getTrustedAppsCreateRouteHandler = (): RequestHandler<
  unknown,
  unknown,
  PostTrustedAppCreateRequest,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, req, res) => {
    return res.ok({
      body: await createTrustedApp(exceptionListClientFromContext(context), req.body),
    });
  };
};

export const getTrustedAppsSummaryRouteHandler = (): RequestHandler<
  unknown,
  unknown,
  PostTrustedAppCreateRequest,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, req, res) => {
    return res.ok({
      body: await getTrustedAppsSummary(exceptionListClientFromContext(context)),
    });
  };
};
