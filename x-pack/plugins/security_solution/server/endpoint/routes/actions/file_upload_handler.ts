/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { UploadActionApiRequestBody } from '../../../../common/api/endpoint';
import { UploadActionRequestSchema } from '../../../../common/api/endpoint';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  ResponseActionUploadParameters,
  ResponseActionUploadOutputContent,
  HostMetadata,
} from '../../../../common/endpoint/types';
import { UPLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
  HapiReadableStream,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';
import { updateCases } from '../../services/actions/create/update_cases';

export const registerActionFileUploadRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  if (!endpointContext.experimentalFeatures.responseActionUploadEnabled) {
    return;
  }

  const logger = endpointContext.logFactory.get('uploadAction');

  router.versioned
    .post({
      access: 'public',
      path: UPLOAD_ROUTE,
      options: {
        authRequired: true,
        tags: ['access:securitySolution'],
        body: {
          accepts: ['multipart/form-data'],
          output: 'stream',
          maxBytes: endpointContext.serverConfig.maxUploadResponseActionFileBytes,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UploadActionRequestSchema,
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
    const fleetFiles = await endpointContext.service.getFleetToHostFilesClient();
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

    const createActionPayload = {
      ...actionPayload,
      parameters: uploadParameters,
      command: 'upload' as ResponseActionsApiCommandNames,
      user,
    };

    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const endpointData = await endpointContext.service
      .getEndpointMetadataService()
      .getMetadataForEndpoints(esClient, [...new Set(createActionPayload.endpoint_ids)]);
    const agentIds = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);

    try {
      const casesClient = await endpointContext.service.getCasesClient(req);
      const { action: actionId, ...data } = await endpointContext.service
        .getActionCreateService()
        .createAction<ResponseActionUploadOutputContent, ResponseActionUploadParameters>(
          createActionPayload,
          agentIds
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

      // update cases
      await updateCases({ casesClient, createActionPayload, endpointData });

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
