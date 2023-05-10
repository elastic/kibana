/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { createFile, deleteFile, setFileActionId } from '../../services';
import type {
  ResponseActionUploadParameters,
  ResponseActionUploadOutputContent,
} from '../../../../common/endpoint/types';
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
): RequestHandler<never, never, UploadActionRequestBody, SecuritySolutionRequestHandlerContext> => {
  const logger = endpointContext.logFactory.get('uploadAction');
  const maxFileBytes = endpointContext.serverConfig.maxUploadResponseActionFileBytes;

  return async (context, req, res) => {
    const user = endpointContext.service.security?.authc.getCurrentUser(req);
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const fileStream = req.body.file as HapiReadableStream;
    const { file: _, parameters: userParams, ...actionPayload } = req.body;
    const uploadParameters: ResponseActionUploadParameters = {
      ...userParams,
      file: {
        file_id: '',
        file_name: '',
        sha256: '',
        size: 0,
      },
    };

    try {
      const createdFile = await createFile({
        esClient,
        logger,
        fileStream,
        agents: actionPayload.endpoint_ids,
        maxFileBytes,
      });

      uploadParameters.file.file_id = createdFile.file.id;
      uploadParameters.file.file_name = createdFile.file.name;
      uploadParameters.file.sha256 = createdFile.file.hash?.sha256;
      uploadParameters.file.size = createdFile.file.size;
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

      await setFileActionId(esClient, logger, data);

      return res.ok({
        body: {
          action: actionId,
          data,
        },
      });
    } catch (err) {
      if (uploadParameters.file.file_id) {
        // Try to delete the created file since creating the action threw an error
        try {
          await deleteFile(esClient, logger, uploadParameters.file.file_id);
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
