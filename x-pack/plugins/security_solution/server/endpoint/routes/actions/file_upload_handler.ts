/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { UploadActionParams } from '../../../../common/endpoint/types';
import { UPLOAD_ROUTE } from '../../../../common/endpoint/constants';
import {
  type UploadActionRequestBody,
  UploadActionRequestSchema,
} from '../../../../common/endpoint/schema/actions';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
  HapiReadableStream,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';

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
          maxBytes: endpointContext.service.getServerConfig().maxUploadResponseActionFileBytes,
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
  const logger = endpointContext.logFactory.get('uploadAction');

  return async (context, req, res) => {
    const user = endpointContext.service.security?.authc.getCurrentUser(req);
    const fileStream = req.body.file as HapiReadableStream;
    const { file: _, parameters: userParams, ...actionPayload } = req.body;
    const uploadParameters: UploadActionParams = {
      ...actionPayload,
      file: {
        file_id: '',
        file_name: '',
        sha256: '',
        size: 0,
      },
    };

    //
    //
    //
    //
    //
    //
    //
    //
    //
    //

    try {
      const casesClient = await endpointContext.service.getCasesClient(req);
      const { action: actionId, ...data } = await endpointContext.service
        .getActionCreateService()
        .createAction(
          {
            ...actionPayload,
            parameters: uploadParameters,
            command: 'upload',
            user,
          },
          casesClient
        );

      return res.ok({
        body: {
          action: actionId,
          data,
        },
      });
    } catch (err) {
      // FIXME:PT delete file if one was created

      return errorHandler(logger, res, err);
    }
  };
};
