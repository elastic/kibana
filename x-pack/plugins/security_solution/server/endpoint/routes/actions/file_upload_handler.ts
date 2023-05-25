/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type {
  ResponseActionUploadParameters,
  ResponseActionUploadOutputContent,
} from '../../../../common/endpoint/types';
import { UPLOAD_ROUTE } from '../../../../common/endpoint/constants';
import {
  type UploadActionApiRequestBody,
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
  if (!endpointContext.experimentalFeatures.responseActionUploadEnabled) {
    return;
  }

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
          maxBytes: endpointContext.serverConfig.maxUploadResponseActionFileBytes,
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
): RequestHandler<
  never,
  never,
  UploadActionApiRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('uploadAction');

  return async (context, req, res) => {
    const fleetFiles = await endpointContext.service.getFleetFilesClient('to-host');
    const user = endpointContext.service.security?.authc.getCurrentUser(req);
    const fileStream = req.body.file as HapiReadableStream;
    const { file: _, parameters: userParams, ...actionPayload } = req.body;
    const uploadParameters: ResponseActionUploadParameters = {
      ...userParams,
      file_id: '',
      file_name: '',
      file_sha256: '',
      file_size: 0,
    };

    try {
      const createdFile = await fleetFiles.create(fileStream, actionPayload.endpoint_ids);

      uploadParameters.file_id = createdFile.id;
      uploadParameters.file_name = createdFile.name;
      uploadParameters.file_sha256 = createdFile.sha256;
      uploadParameters.file_size = createdFile.size;
    } catch (err) {
      return errorHandler(logger, res, err);
    }

    try {
      const casesClient = await endpointContext.service.getCasesClient(req);
      const { action: actionId, ...data } = await endpointContext.service
        .getActionCreateService()
        .createAction<ResponseActionUploadOutputContent, ResponseActionUploadParameters>(
          {
            ...actionPayload,
            parameters: uploadParameters,
            command: 'upload',
            user,
          },
          { casesClient }
        );

      // Update the file meta to include the action id, and if any errors (unlikely),
      // then just log them and still allow api to return success since the action has
      // already been created and potentially dispatched to Endpoint. Action ID is not
      // needed by the Endpoint or fleet-server's API, so no need to fail here
      try {
        await fleetFiles.update(uploadParameters.file_id, { actionId: data.id });
      } catch (e) {
        logger.warn(`Attempt to update File meta with Action ID failed: ${e.message}`, e);
      }

      return res.ok({
        body: {
          action: actionId,
          data,
        },
      });
    } catch (err) {
      if (uploadParameters.file_id) {
        // Try to delete the created file since creating the action threw an error
        try {
          await fleetFiles.delete(uploadParameters.file_id);
        } catch (e) {
          logger.error(
            `Attempt to clean up file (after action creation was unsuccessful) failed; ${e.message}`,
            e
          );
        }
      }

      return errorHandler(logger, res, err);
    }
  };
};
