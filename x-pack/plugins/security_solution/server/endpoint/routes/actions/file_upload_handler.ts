/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { UPLOAD_ROUTE } from '../../../../common/endpoint/constants';
import {
  type UploadActionRequestBody,
  UploadActionRequestSchema,
} from '../../../../common/endpoint/schema/actions';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerActionFileUploadRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  const logger = endpointContext.logFactory.get('uploadAction');

  router.post(
    {
      path: UPLOAD_ROUTE,
      validate: UploadActionRequestSchema,
      options: {
        authRequired: true,
        tags: ['access:securitySolution'],
        body: {
          accepts: ['multipart/form-data'],
          output: 'stream',
          maxBytes: 26214400, // FIXME:PT use config value using endpointContext.config()
        },
      },
    },
    withEndpointAuthz(
      { all: ['canWriteFileOperations'] },
      logger,
      getActionFileUploadHandler(endpointContext)
    )
  );
};

export const getActionFileUploadHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<never, never, UploadActionRequestBody, SecuritySolutionRequestHandlerContext> => {
  // responseActionRequestHandler<ResponseActionsExecuteParameters>(endpointContext, 'execute')

  return async (context, req, res) => {
    return res.noContent();
  };
};
